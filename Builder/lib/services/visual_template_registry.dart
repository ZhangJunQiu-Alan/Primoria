/// Registry of built-in visual simulation templates.
library;

import '../models/block.dart'
    show
        InteractiveVisualContent,
        VisualControl,
        VisualFormula,
        VisualLayoutPreset,
        VisualMode,
        VisualPlayback,
        VisualThemeTone;

/// Registry of built-in visual simulation templates.
/// Each template provides a default spec and a human-readable label.
class VisualTemplateRegistry {
  VisualTemplateRegistry._();

  static const Map<String, String> labels = {
    InteractiveVisualContent.templateGeneric: 'Generic Scene',
    InteractiveVisualContent.templateIdealGasPiston: 'Ideal Gas (PV=nRT)',
    InteractiveVisualContent.templateSortingBars: 'Sorting Bars',
    InteractiveVisualContent.templateVariableBindingMemory: 'Variable Memory',
    InteractiveVisualContent.templateFunctionPlot: 'Function Plot',
    InteractiveVisualContent.templatePendulum: 'Pendulum',
    InteractiveVisualContent.templateWave: 'Wave',
    InteractiveVisualContent.templateProjectile: 'Projectile Motion',
    InteractiveVisualContent.templatePythagorean: 'Pythagorean Theorem',
    InteractiveVisualContent.templateUnitCircle: 'Unit Circle',
  };

  static const Map<String, String> descriptions = {
    InteractiveVisualContent.templateGeneric: 'Generic visual scene',
    InteractiveVisualContent.templateIdealGasPiston:
        'Interactive ideal gas law: adjust P, V, n, T and see the piston move',
    InteractiveVisualContent.templateSortingBars:
        'Visualize sorting algorithms step by step',
    InteractiveVisualContent.templateVariableBindingMemory:
        'Show variable-to-memory-slot bindings',
    InteractiveVisualContent.templateFunctionPlot:
        'Plot a mathematical function with parameter sliders',
    InteractiveVisualContent.templatePendulum:
        'Animated pendulum with length and gravity sliders',
    InteractiveVisualContent.templateWave:
        'Traveling sine wave with amplitude and frequency controls',
    InteractiveVisualContent.templateProjectile:
        'Projectile motion with launch angle and velocity sliders',
    InteractiveVisualContent.templatePythagorean:
        'Right triangle: adjust a and b to see how c changes',
    InteractiveVisualContent.templateUnitCircle:
        'Unit circle: rotate the angle and see sin/cos projections',
  };

  /// Returns a default InteractiveVisualContent for the given template name.
  static InteractiveVisualContent defaultSpecFor(String template) {
    switch (template) {
      case InteractiveVisualContent.templateIdealGasPiston:
        return _idealGasPiston();
      case InteractiveVisualContent.templateSortingBars:
        return _sortingBars();
      case InteractiveVisualContent.templateVariableBindingMemory:
        return _variableBindingMemory();
      case InteractiveVisualContent.templateFunctionPlot:
        return _functionPlot();
      case InteractiveVisualContent.templatePendulum:
        return _pendulum();
      case InteractiveVisualContent.templateWave:
        return _wave();
      case InteractiveVisualContent.templateProjectile:
        return _projectile();
      case InteractiveVisualContent.templatePythagorean:
        return _pythagorean();
      case InteractiveVisualContent.templateUnitCircle:
        return _unitCircle();
      default:
        return const InteractiveVisualContent(
          template: InteractiveVisualContent.templateGeneric,
          title: 'Visual Scene',
          mode: VisualMode.interactive,
        );
    }
  }

  static InteractiveVisualContent _idealGasPiston() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templateIdealGasPiston,
      title: 'Ideal Gas Law: PV = nRT',
      description:
          'Explore how pressure, volume, amount, and temperature relate for an ideal gas.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {
        'P': 1.0,
        'V': 22.4,
        'n': 1.0,
        'T': 273.0,
      },
      controls: [
        VisualControl(
          id: 'ctrl_T',
          type: VisualControl.typeSlider,
          label: 'Temperature',
          stateKey: 'T',
          min: 100,
          max: 600,
          step: 1,
          unit: 'K',
          defaultValue: 273.0,
        ),
        VisualControl(
          id: 'ctrl_n',
          type: VisualControl.typeSlider,
          label: 'Amount',
          stateKey: 'n',
          min: 0.1,
          max: 5.0,
          step: 0.1,
          unit: 'mol',
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'ctrl_P',
          type: VisualControl.typeSlider,
          label: 'Pressure',
          stateKey: 'P',
          min: 0.1,
          max: 10.0,
          step: 0.1,
          unit: 'atm',
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'PV = nRT',
          description: 'Ideal Gas Law',
          variableLabels: {
            'P': 'Pressure (atm)',
            'V': 'Volume (L)',
            'n': 'Amount (mol)',
            'R': '0.08206 L·atm/mol·K',
            'T': 'Temperature (K)',
          },
        ),
      ],
      scene: {
        'pistonHeightFraction': 0.5,
        'particleCount': 20,
        'particleSpeedFactor': 1.0,
      },
      bindings: {
        'V': 'scene.pistonHeightFraction',
        'n': 'scene.particleCount',
        'T': 'scene.particleSpeedFactor',
      },
      actions: ['reset'],
      playback: VisualPlayback(
        autoplay: false,
        allowStep: false,
        allowReset: true,
        transitionMs: 250,
      ),
    );
  }

  static InteractiveVisualContent _sortingBars() {
    return InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.guided,
      template: InteractiveVisualContent.templateSortingBars,
      title: 'Bubble Sort Visualization',
      description:
          'Step through a bubble sort algorithm and watch the bars rearrange.',
      layoutPreset: VisualLayoutPreset.stack,
      controlsPosition: 'bottom',
      formulaPosition: 'hidden',
      themeTone: VisualThemeTone.lab,
      initialState: {
        'values': [5, 3, 8, 1, 9, 2, 7, 4, 6],
        'stepIndex': 0,
        'comparing': <int>[],
        'swapped': <int>[],
        'sorted': <int>[],
      },
      controls: const [
        VisualControl(
          id: 'btn_step',
          type: VisualControl.typeButton,
          label: 'Step',
          action: 'step',
        ),
        VisualControl(
          id: 'btn_play',
          type: VisualControl.typeButton,
          label: 'Play',
          action: 'play',
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
        VisualControl(
          id: 'btn_randomize',
          type: VisualControl.typeButton,
          label: 'Randomize',
          action: 'randomize',
        ),
      ],
      scene: const {
        'algorithm': 'bubble-sort',
        'barCount': 9,
      },
      bindings: const {},
      actions: const ['step', 'play', 'pause', 'reset', 'randomize'],
      playback: const VisualPlayback(
        autoplay: false,
        allowStep: true,
        allowReset: true,
        transitionMs: 300,
      ),
    );
  }

  static InteractiveVisualContent _variableBindingMemory() {
    return InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.guided,
      template: InteractiveVisualContent.templateVariableBindingMemory,
      title: 'Variable Memory Model',
      description:
          'See how variables bind to memory slots during assignment.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'bottom',
      formulaPosition: 'hidden',
      themeTone: VisualThemeTone.chalk,
      initialState: {
        'stepIndex': 0,
        'variables': <Map<String, dynamic>>[],
        'memory': <Map<String, dynamic>>[],
      },
      controls: const [
        VisualControl(
          id: 'btn_step',
          type: VisualControl.typeButton,
          label: 'Next Step',
          action: 'step',
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      scene: const {
        'steps': [
          {'code': 'x = 5', 'varName': 'x', 'value': 5, 'address': '0x001'},
          {'code': 'y = x', 'varName': 'y', 'value': 5, 'address': '0x002'},
          {
            'code': 'x = 10',
            'varName': 'x',
            'value': 10,
            'address': '0x001',
          },
        ],
      },
      bindings: const {},
      actions: const ['step', 'reset'],
      playback: const VisualPlayback(
        autoplay: false,
        allowStep: true,
        allowReset: true,
        transitionMs: 200,
      ),
    );
  }

  static InteractiveVisualContent _functionPlot() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templateFunctionPlot,
      title: 'Function Plot',
      description:
          'Explore how parameters affect the shape of a function.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {
        'a': 1.0,
        'b': 0.0,
        'c': 0.0,
      },
      controls: [
        VisualControl(
          id: 'ctrl_a',
          type: VisualControl.typeSlider,
          label: 'a',
          stateKey: 'a',
          min: -5.0,
          max: 5.0,
          step: 0.1,
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'ctrl_b',
          type: VisualControl.typeSlider,
          label: 'b',
          stateKey: 'b',
          min: -10.0,
          max: 10.0,
          step: 0.5,
          defaultValue: 0.0,
        ),
        VisualControl(
          id: 'ctrl_c',
          type: VisualControl.typeSlider,
          label: 'c',
          stateKey: 'c',
          min: -10.0,
          max: 10.0,
          step: 0.5,
          defaultValue: 0.0,
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'f(x) = ax² + bx + c',
          variableLabels: {
            'a': 'quadratic',
            'b': 'linear',
            'c': 'constant',
          },
        ),
      ],
      scene: {
        'xMin': -10.0,
        'xMax': 10.0,
        'yMin': -20.0,
        'yMax': 20.0,
        'expression': 'quadratic',
      },
      bindings: {},
      actions: ['reset'],
      playback: VisualPlayback(
        autoplay: false,
        allowStep: false,
        allowReset: true,
        transitionMs: 100,
      ),
    );
  }

  static InteractiveVisualContent _pendulum() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templatePendulum,
      title: 'Simple Pendulum',
      description: 'Explore how length and gravity affect pendulum period.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {'length': 1.0, 'gravity': 9.8, 'angle0': 30.0},
      controls: [
        VisualControl(
          id: 'ctrl_length',
          type: VisualControl.typeSlider,
          label: 'Length',
          stateKey: 'length',
          min: 0.2,
          max: 2.0,
          step: 0.1,
          unit: 'm',
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'ctrl_gravity',
          type: VisualControl.typeSlider,
          label: 'Gravity',
          stateKey: 'gravity',
          min: 1.0,
          max: 20.0,
          step: 0.5,
          unit: 'm/s²',
          defaultValue: 9.8,
        ),
        VisualControl(
          id: 'ctrl_angle0',
          type: VisualControl.typeSlider,
          label: 'Angle',
          stateKey: 'angle0',
          min: 5.0,
          max: 80.0,
          step: 1.0,
          unit: '°',
          defaultValue: 30.0,
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'T = 2π√(L/g)',
          description: 'Period of a simple pendulum',
        ),
      ],
      scene: {},
      bindings: {},
      actions: ['reset'],
      playback: VisualPlayback(
        autoplay: true,
        allowStep: false,
        allowReset: true,
        transitionMs: 16,
      ),
    );
  }

  static InteractiveVisualContent _wave() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templateWave,
      title: 'Transverse Wave',
      description: 'Adjust amplitude and frequency of a traveling sine wave.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lab,
      initialState: {'amplitude': 0.5, 'frequency': 1.0, 'speed': 1.0},
      controls: [
        VisualControl(
          id: 'ctrl_amp',
          type: VisualControl.typeSlider,
          label: 'Amplitude',
          stateKey: 'amplitude',
          min: 0.1,
          max: 1.0,
          step: 0.05,
          unit: 'A',
          defaultValue: 0.5,
        ),
        VisualControl(
          id: 'ctrl_freq',
          type: VisualControl.typeSlider,
          label: 'Frequency',
          stateKey: 'frequency',
          min: 0.5,
          max: 4.0,
          step: 0.25,
          unit: 'Hz',
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'ctrl_speed',
          type: VisualControl.typeSlider,
          label: 'Speed',
          stateKey: 'speed',
          min: 0.5,
          max: 3.0,
          step: 0.25,
          unit: 'm/s',
          defaultValue: 1.0,
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'y(x,t) = A·sin(2πfx − 2πft)',
          description: 'Traveling wave equation',
        ),
      ],
      scene: {},
      bindings: {},
      actions: ['reset'],
      playback: VisualPlayback(
        autoplay: true,
        allowStep: false,
        allowReset: true,
        transitionMs: 16,
      ),
    );
  }

  static InteractiveVisualContent _projectile() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templateProjectile,
      title: 'Projectile Motion',
      description: 'Launch angle and initial velocity determine the trajectory.',
      layoutPreset: VisualLayoutPreset.stack,
      controlsPosition: 'bottom',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {'angle': 45.0, 'velocity': 20.0, 'gravity': 9.8},
      controls: [
        VisualControl(
          id: 'ctrl_angle',
          type: VisualControl.typeSlider,
          label: 'Angle',
          stateKey: 'angle',
          min: 5.0,
          max: 85.0,
          step: 1.0,
          unit: '°',
          defaultValue: 45.0,
        ),
        VisualControl(
          id: 'ctrl_vel',
          type: VisualControl.typeSlider,
          label: 'Velocity',
          stateKey: 'velocity',
          min: 5.0,
          max: 50.0,
          step: 1.0,
          unit: 'm/s',
          defaultValue: 20.0,
        ),
        VisualControl(
          id: 'btn_launch',
          type: VisualControl.typeButton,
          label: 'Launch',
          action: 'play',
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'x = v₀cosθ·t,  y = v₀sinθ·t − ½gt²',
          description: 'Kinematic equations',
        ),
      ],
      scene: {},
      bindings: {},
      actions: ['play', 'reset'],
      playback: VisualPlayback(
        autoplay: false,
        allowStep: false,
        allowReset: true,
        transitionMs: 16,
      ),
    );
  }

  static InteractiveVisualContent _pythagorean() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templatePythagorean,
      title: 'Pythagorean Theorem',
      description: 'Adjust sides a and b to see how c² = a² + b².',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {'a': 3.0, 'b': 4.0},
      controls: [
        VisualControl(
          id: 'ctrl_a',
          type: VisualControl.typeSlider,
          label: 'Side a',
          stateKey: 'a',
          min: 1.0,
          max: 8.0,
          step: 0.5,
          defaultValue: 3.0,
        ),
        VisualControl(
          id: 'ctrl_b',
          type: VisualControl.typeSlider,
          label: 'Side b',
          stateKey: 'b',
          min: 1.0,
          max: 8.0,
          step: 0.5,
          defaultValue: 4.0,
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'a² + b² = c²',
          description: 'Pythagorean theorem',
        ),
      ],
      scene: {},
      bindings: {},
      actions: [],
      playback: VisualPlayback(
        autoplay: false,
        allowStep: false,
        allowReset: false,
        transitionMs: 100,
      ),
    );
  }

  static InteractiveVisualContent _unitCircle() {
    return const InteractiveVisualContent(
      version: InteractiveVisualContent.engineVersion,
      mode: VisualMode.interactive,
      template: InteractiveVisualContent.templateUnitCircle,
      title: 'Unit Circle',
      description:
          'Rotate the angle to see sin, cos, and tan update on the unit circle.',
      layoutPreset: VisualLayoutPreset.split,
      controlsPosition: 'left',
      formulaPosition: 'top',
      themeTone: VisualThemeTone.lightScience,
      initialState: {'angle': 45.0},
      controls: [
        VisualControl(
          id: 'ctrl_angle',
          type: VisualControl.typeSlider,
          label: 'Angle θ',
          stateKey: 'angle',
          min: 0.0,
          max: 360.0,
          step: 1.0,
          unit: '°',
          defaultValue: 45.0,
        ),
        VisualControl(
          id: 'btn_play',
          type: VisualControl.typeButton,
          label: 'Animate',
          action: 'play',
        ),
        VisualControl(
          id: 'btn_reset',
          type: VisualControl.typeButton,
          label: 'Reset',
          action: 'reset',
        ),
      ],
      formulas: [
        VisualFormula(
          id: 'f1',
          expression: 'sin θ = y,  cos θ = x,  tan θ = y/x',
          description: 'Trig definitions on the unit circle',
        ),
      ],
      scene: {},
      bindings: {},
      actions: ['play', 'reset'],
      playback: VisualPlayback(
        autoplay: false,
        allowStep: false,
        allowReset: true,
        transitionMs: 16,
      ),
    );
  }
}
