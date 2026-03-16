import 'package:builder/models/models.dart';
import 'package:builder/services/visual_template_registry.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('InteractiveVisualContent serialization', () {
    test('roundtrip toJson/fromJson preserves all fields', () {
      const original = InteractiveVisualContent(
        version: 'sim-v1',
        mode: VisualMode.interactive,
        template: InteractiveVisualContent.templateIdealGasPiston,
        title: 'Ideal Gas Test',
        description: 'Test description',
        layoutPreset: VisualLayoutPreset.split,
        themeTone: VisualThemeTone.lightScience,
        initialState: {'P': 1.0, 'V': 22.4, 'n': 1.0, 'T': 273.0},
        controls: [
          VisualControl(
            id: 'ctrl_T',
            type: VisualControl.typeSlider,
            label: 'Temperature',
            stateKey: 'T',
            min: 100,
            max: 600,
            defaultValue: 273.0,
          ),
        ],
        formulas: [
          VisualFormula(id: 'f1', expression: 'PV = nRT'),
        ],
        aiPrompt: 'Demonstrate ideal gas law',
      );

      final json = original.toJson();
      final restored = InteractiveVisualContent.fromJson(json);

      expect(restored.version, 'sim-v1');
      expect(restored.mode, VisualMode.interactive);
      expect(restored.template, InteractiveVisualContent.templateIdealGasPiston);
      expect(restored.title, 'Ideal Gas Test');
      expect(restored.description, 'Test description');
      expect(restored.initialState['P'], 1.0);
      expect(restored.controls.length, 1);
      expect(restored.controls.first.id, 'ctrl_T');
      expect(restored.formulas.length, 1);
      expect(restored.formulas.first.expression, 'PV = nRT');
      expect(restored.aiPrompt, 'Demonstrate ideal gas law');
    });

    test('fromJson normalizes unknown mode to presentation', () {
      final json = {
        'version': 'sim-v1',
        'mode': 'unknown-mode',
        'template': 'generic',
        'title': '',
      };
      final content = InteractiveVisualContent.fromJson(json);
      expect(content.mode, VisualMode.presentation);
    });

    test('fromJson handles missing fields with defaults', () {
      final content = InteractiveVisualContent.fromJson({'title': 'Minimal'});
      expect(content.version, InteractiveVisualContent.engineVersion);
      expect(content.controls, isEmpty);
      expect(content.formulas, isEmpty);
      expect(content.checks, isEmpty);
      expect(content.initialState, isEmpty);
    });

    test('JSON roundtrip through Block.fromJson/toJson', () {
      final block = Block.create(BlockType.interactiveVisual, order: 0);
      final json = block.toJson();
      final restored = Block.fromJson(json);
      expect(restored.type, BlockType.interactiveVisual);
      expect(restored.content, isA<InteractiveVisualContent>());
    });
  });

  group('VisualCheck.evaluate', () {
    test('eq operator matches exact value', () {
      const check = VisualCheck(
        id: 'c1',
        description: 'test',
        stateKey: 'x',
        operator: 'eq',
        target: 5.0,
      );
      expect(check.evaluate({'x': 5.0}), isTrue);
      expect(check.evaluate({'x': 4.9}), isFalse);
    });

    test('range operator works', () {
      const check = VisualCheck(
        id: 'c2',
        description: 'test',
        stateKey: 'T',
        operator: 'range',
        target: 200,
        targetMax: 400,
      );
      expect(check.evaluate({'T': 300}), isTrue);
      expect(check.evaluate({'T': 100}), isFalse);
      expect(check.evaluate({'T': 500}), isFalse);
    });
  });

  group('VisualTemplateRegistry', () {
    test('all templates return valid specs', () {
      final templates = [
        InteractiveVisualContent.templateGeneric,
        InteractiveVisualContent.templateIdealGasPiston,
        InteractiveVisualContent.templateSortingBars,
        InteractiveVisualContent.templateVariableBindingMemory,
        InteractiveVisualContent.templateFunctionPlot,
      ];
      for (final t in templates) {
        final spec = VisualTemplateRegistry.defaultSpecFor(t);
        expect(spec.template, t);
        expect(spec.version, InteractiveVisualContent.engineVersion);
        // Check JSON roundtrip
        final json = spec.toJson();
        final restored = InteractiveVisualContent.fromJson(json);
        expect(restored.template, t);
      }
    });

    test('ideal-gas-piston has P, V, n, T in initialState', () {
      final spec = VisualTemplateRegistry.defaultSpecFor(
        InteractiveVisualContent.templateIdealGasPiston,
      );
      expect(spec.initialState.containsKey('P'), isTrue);
      expect(spec.initialState.containsKey('V'), isTrue);
      expect(spec.initialState.containsKey('n'), isTrue);
      expect(spec.initialState.containsKey('T'), isTrue);
    });

    test('sorting-bars has values array in initialState', () {
      final spec = VisualTemplateRegistry.defaultSpecFor(
        InteractiveVisualContent.templateSortingBars,
      );
      expect(spec.initialState.containsKey('values'), isTrue);
      expect(spec.initialState['values'], isList);
    });
  });

  group('Legacy animation migration', () {
    test('fromLegacyAnimationJson preserves customHtml and aiPrompt', () {
      final legacyJson = {
        'preset': 'custom',
        'durationMs': 3000,
        'loop': true,
        'speed': 1.0,
        'customHtml': '<html><body>test</body></html>',
        'aiPrompt': 'bouncing ball animation',
      };
      final content =
          InteractiveVisualContent.fromLegacyAnimationJson(legacyJson);
      expect(content.legacyCustomHtml, '<html><body>test</body></html>');
      expect(content.aiPrompt, 'bouncing ball animation');
      expect(content.version, InteractiveVisualContent.engineVersion);
      expect(content.mode, VisualMode.presentation);
    });

    test('block type interactiveVisual is in BlockType.values', () {
      final types = BlockType.values.map((t) => t.value).toList();
      expect(types.contains('interactive-visual'), isTrue);
    });
  });

  group('InteractiveVisualContent copyWith', () {
    test('copyWith updates single fields', () {
      const content = InteractiveVisualContent(title: 'Original');
      final updated = content.copyWith(
        title: 'Updated',
        mode: VisualMode.assessment,
      );
      expect(updated.title, 'Updated');
      expect(updated.mode, VisualMode.assessment);
      expect(updated.template, content.template);
    });

    test('clearLegacyCustomHtml removes html', () {
      final content =
          const InteractiveVisualContent().copyWith(legacyCustomHtml: '<html/>');
      expect(content.legacyCustomHtml, '<html/>');
      final cleared = content.copyWith(clearLegacyCustomHtml: true);
      expect(cleared.legacyCustomHtml, isNull);
    });
  });
}
