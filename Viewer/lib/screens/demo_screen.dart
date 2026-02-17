import 'package:flutter/material.dart';
import '../components/game/game_container.dart';
import '../components/interactions/slider_interaction.dart'
    show InteractiveSlider;
import '../components/feedback/feedback_dialog.dart';
import '../models/unit_model.dart';
import '../theme/theme.dart';

/// Demo screen - showcasing slider interaction component
class DemoScreen extends StatefulWidget {
  const DemoScreen({super.key});

  @override
  State<DemoScreen> createState() => _DemoScreenState();
}

class _DemoScreenState extends State<DemoScreen> {
  double _currentValue = 50;
  int _currentIndex = 1;
  final int _totalCount = 5;

  // Sample data
  final _sliderConfig = const SliderConfig(
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    unit: '°C',
    showValue: true,
    labels: SliderLabels(minLabel: 'Ice Cold', maxLabel: 'Boiling'),
  );

  final _targetValue = 85.0;
  final _tolerance = 5.0;

  void _onSliderChanged(double value) {
    setState(() => _currentValue = value);
  }

  void _onSubmit() {
    final isCorrect = (_currentValue - _targetValue).abs() <= _tolerance;

    if (isCorrect) {
      context.showSuccessFeedback(
        title: 'Awesome!',
        message:
            'Around 85°C is the optimal temperature for brewing green tea.',
        explanation:
            'Green tea is rich in tea polyphenols, and water that is too hot will destroy these nutrients.',
        onContinue: _nextQuestion,
      );
    } else {
      final isTooHigh = _currentValue > _targetValue + _tolerance;
      context.showFailureFeedback(
        title: 'Try Again',
        message: isTooHigh
            ? 'The temperature is too high, it will destroy the nutrients in the tea.'
            : 'The temperature is too low to fully release the tea\'s aroma.',
        hintButtonText: 'View Hint',
        onRetry: () {},
        onHint: _showHint,
      );
    }
  }

  void _nextQuestion() {
    if (_currentIndex < _totalCount) {
      setState(() {
        _currentIndex++;
        _currentValue = 50;
      });
    } else {
      // Completed all questions
      _showCompletionDialog();
    }
  }

  void _showHint() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hint'),
        content: const Text('Green tea is best brewed with water at 80-90°C.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Congratulations!'),
        content: const Text('You have completed all questions.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _currentIndex = 1;
                _currentValue = 50;
              });
            },
            child: const Text('Start Over'),
          ),
        ],
      ),
    );
  }

  void _onExit() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Exit?'),
        content: const Text(
          'Your current progress will not be saved after exiting.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Exit logic
            },
            child: Text('Exit', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GameContainer(
      title: 'Adjust Water Temperature',
      currentIndex: _currentIndex,
      totalCount: _totalCount,
      onSubmit: _onSubmit,
      onHint: _showHint,
      onExit: _onExit,
      isSubmitEnabled: true,
      content: InteractiveSlider(
        config: _sliderConfig,
        description:
            'Please adjust the water temperature to a suitable level for brewing tea (Celsius)',
        onChanged: _onSliderChanged,
        initialValue: _currentValue,
      ),
    );
  }
}
