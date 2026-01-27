import 'package:flutter/material.dart';
import '../components/game/game_container.dart';
import '../components/interactions/slider_interaction.dart' show InteractiveSlider;
import '../components/feedback/feedback_dialog.dart';
import '../models/unit_model.dart';
import '../theme/theme.dart';

/// 演示页面 - 展示滑块交互组件
class DemoScreen extends StatefulWidget {
  const DemoScreen({super.key});

  @override
  State<DemoScreen> createState() => _DemoScreenState();
}

class _DemoScreenState extends State<DemoScreen> {
  double _currentValue = 50;
  int _currentIndex = 1;
  final int _totalCount = 5;

  // 示例数据
  final _sliderConfig = const SliderConfig(
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    unit: '°C',
    showValue: true,
    labels: SliderLabels(
      minLabel: '冰冷',
      maxLabel: '沸腾',
    ),
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
        title: '太棒了！',
        message: '85°C 左右是泡绿茶的最佳温度。',
        explanation: '绿茶中含有丰富的茶多酚，过高的水温会破坏这些营养成分。',
        onContinue: _nextQuestion,
      );
    } else {
      final isTooHigh = _currentValue > _targetValue + _tolerance;
      context.showFailureFeedback(
        title: '再想想',
        message: isTooHigh
            ? '温度太高了，会破坏茶叶中的营养成分。'
            : '温度太低了，无法充分释放茶叶的香味。',
        hintButtonText: '查看提示',
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
      // 完成所有题目
      _showCompletionDialog();
    }
  }

  void _showHint() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('提示'),
        content: const Text('绿茶适合用 80-90°C 的水冲泡。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('恭喜完成！'),
        content: const Text('你已完成所有题目。'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _currentIndex = 1;
                _currentValue = 50;
              });
            },
            child: const Text('重新开始'),
          ),
        ],
      ),
    );
  }

  void _onExit() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确定退出？'),
        content: const Text('退出后当前进度将不会保存。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // 退出逻辑
            },
            child: Text(
              '退出',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GameContainer(
      title: '调整水温',
      currentIndex: _currentIndex,
      totalCount: _totalCount,
      onSubmit: _onSubmit,
      onHint: _showHint,
      onExit: _onExit,
      isSubmitEnabled: true,
      content: InteractiveSlider(
        config: _sliderConfig,
        description: '请将水温调整到适合泡茶的温度（摄氏度）',
        onChanged: _onSliderChanged,
        initialValue: _currentValue,
      ),
    );
  }
}
