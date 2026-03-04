import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
import '../services/achievement_service.dart';
import '../services/supabase_service.dart';

/// Full-screen-ish dialog shown when a new achievement is unlocked.
class AchievementUnlockPopup extends StatefulWidget {
  final AchievementModel achievement;

  const AchievementUnlockPopup({super.key, required this.achievement});

  @override
  State<AchievementUnlockPopup> createState() => _AchievementUnlockPopupState();
}

class _AchievementUnlockPopupState extends State<AchievementUnlockPopup>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  bool _isPinned = false;
  bool _saving = false;
  List<String> _pinnedIds = [];

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _scaleAnim = CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut);
    _fadeAnim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();
    _loadPinned();
  }

  Future<void> _loadPinned() async {
    final ids = await SupabaseService.getPinnedAchievementIds();
    if (!mounted) return;
    setState(() {
      _pinnedIds = ids;
      _isPinned = ids.contains(widget.achievement.id);
    });
  }

  Future<void> _togglePin() async {
    if (_saving) return;
    setState(() => _saving = true);

    List<String> updated;
    if (_isPinned) {
      updated = _pinnedIds.where((id) => id != widget.achievement.id).toList();
    } else {
      if (_pinnedIds.length >= 3) {
        // Replace the oldest (first) pinned achievement
        updated = [..._pinnedIds.skip(1), widget.achievement.id];
      } else {
        updated = [..._pinnedIds, widget.achievement.id];
      }
    }

    await SupabaseService.savePinnedAchievementIds(updated);
    if (!mounted) return;
    setState(() {
      _pinnedIds = updated;
      _isPinned = !_isPinned;
      _saving = false;
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    final style = AchievementService.rarityStyle(
      widget.achievement.rarity,
      t.isZh,
    );
    final rarityColor = Color(style.color);
    final glowColor = Color(style.glowColor);

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: ScaleTransition(
          scale: _scaleAnim,
          child: Container(
            width: 320,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: glowColor,
                  blurRadius: 40,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title
                Text(
                  t.achievementUnlocked,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                    color: rarityColor,
                  ),
                ),
                const SizedBox(height: 16),
                // Badge icon
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        rarityColor.withValues(alpha: 0.15),
                        rarityColor.withValues(alpha: 0.05),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(color: rarityColor, width: 2),
                  ),
                  child: Center(
                    child: Text(
                      AchievementService.categoryIcon(
                        widget.achievement.category,
                      ),
                      style: const TextStyle(fontSize: 44),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Rarity label
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: rarityColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: rarityColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    style.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: rarityColor,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Achievement name
                Text(
                  widget.achievement.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                // Description
                Text(
                  widget.achievement.description,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 24),
                // Pin button
                OutlinedButton.icon(
                  onPressed: _saving ? null : _togglePin,
                  icon: Icon(
                    _isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                    size: 16,
                  ),
                  label: Text(
                    _isPinned ? t.achievementPinned : t.achievementPin,
                    style: const TextStyle(fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: rarityColor,
                    side: BorderSide(
                      color: _isPinned
                          ? rarityColor
                          : const Color(0xFFE2E8F0),
                    ),
                    backgroundColor: _isPinned
                        ? rarityColor.withValues(alpha: 0.06)
                        : null,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Continue button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: FilledButton.styleFrom(
                      backgroundColor: rarityColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      t.achievementContinue,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
