import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// A single option for [AppDropdown].
class AppDropdownItem<T> {
  final T value;
  final String label;

  const AppDropdownItem({required this.value, required this.label});
}

/// Styled dropdown for the Primoria Builder.
///
/// [light: false] (default) — dark-green trigger, white text, green selected highlight.
/// [light: true]            — matches dialog TextFields: outline border, dark text.
class AppDropdown<T> extends StatelessWidget {
  final T? value;
  final String? labelText;
  final List<AppDropdownItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final bool isExpanded;
  final bool isDense;
  final Widget? hint;
  final Widget? prefixIcon;

  /// When true, uses the light dialog style (gray outline, dark text) instead
  /// of the dark-green Builder panel style.
  final bool light;

  const AppDropdown({
    super.key,
    this.value,
    this.labelText,
    required this.items,
    this.onChanged,
    this.isExpanded = true,
    this.isDense = false,
    this.hint,
    this.prefixIcon,
    this.light = false,
  });

  @override
  Widget build(BuildContext context) {
    return light ? _buildLight(context) : _buildDark(context);
  }

  // ── Dark (Builder panel) style ──────────────────────────────────────────

  Widget _buildDark(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      isExpanded: isExpanded,
      dropdownColor: Colors.white,
      icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
      decoration: InputDecoration(
        labelText: labelText,
        labelStyle: const TextStyle(color: AppColors.secondary200),
        floatingLabelStyle: const TextStyle(
          color: AppColors.secondary300,
          fontSize: AppFontSize.xs,
        ),
        isDense: isDense,
        filled: true,
        fillColor: AppColors.secondary800,
        prefixIcon: prefixIcon,
        contentPadding: EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: isDense ? AppSpacing.xs : AppSpacing.sm,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          borderSide: const BorderSide(color: AppColors.secondary600),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          borderSide: const BorderSide(color: AppColors.secondary600),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          borderSide: const BorderSide(color: AppColors.secondary400, width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          borderSide: const BorderSide(color: AppColors.secondary900),
        ),
      ),
      selectedItemBuilder: (context) => items
          .map(
            (item) => Align(
              alignment: Alignment.centerLeft,
              child: Text(
                item.label,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: AppFontSize.sm,
                ),
              ),
            ),
          )
          .toList(),
      items: items.map((item) {
        final isSelected = item.value == value;
        return DropdownMenuItem<T>(
          value: item.value,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: isSelected
                ? BoxDecoration(
                    color: AppColors.secondary500,
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm - 4),
                  )
                : null,
            child: Text(
              item.label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.neutral900,
                fontSize: AppFontSize.sm,
              ),
            ),
          ),
        );
      }).toList(),
      onChanged: onChanged,
      hint: hint,
    );
  }

  // ── Light (dialog) style ────────────────────────────────────────────────

  Widget _buildLight(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      isExpanded: isExpanded,
      dropdownColor: Colors.white,
      menuMaxHeight: 280,
      borderRadius: BorderRadius.circular(16),
      icon: Icon(
        Icons.keyboard_arrow_down_rounded,
        color: AppColors.neutral600,
      ),
      style: const TextStyle(
        color: AppColors.neutral900,
        fontSize: AppFontSize.sm,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        labelText: labelText,
        prefixIcon: prefixIcon,
        isDense: isDense,
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: isDense ? 12 : AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.neutral200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.neutral200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary300, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
      ),
      selectedItemBuilder: (context) => items
          .map(
            (item) => Align(
              alignment: Alignment.centerLeft,
              child: Text(
                item.label,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                style: const TextStyle(
                  color: AppColors.neutral900,
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          )
          .toList(),
      items: items.map((item) {
        final isSelected = item.value == value;
        return DropdownMenuItem<T>(
          value: item.value,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary50 : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              item.label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(
                color: isSelected ? AppColors.primary700 : AppColors.neutral800,
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        );
      }).toList(),
      onChanged: onChanged,
      hint: hint,
    );
  }
}
