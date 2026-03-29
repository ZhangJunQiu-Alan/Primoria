class StudyCallWindowResult {
  final bool opened;
  final String? message;

  const StudyCallWindowResult({required this.opened, this.message});
}

Future<StudyCallWindowResult> openStudyCallWindow({
  required String roomTitle,
  required String focus,
  required String schedule,
  required List<String> participants,
  required String accentHex,
}) async {
  return const StudyCallWindowResult(
    opened: false,
    message: 'Pop-out study calls are currently available on Web.',
  );
}
