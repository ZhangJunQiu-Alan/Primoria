// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

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
  final normalizedParticipants = participants.isEmpty
      ? const ['You']
      : List<String>.from(participants);

  final dynamic popup = html.window.open(
    '',
    'primoria-study-call-${DateTime.now().microsecondsSinceEpoch}',
    'popup=yes,width=1440,height=920,left=120,top=90,resizable=yes,scrollbars=yes',
  );

  if (popup == null) {
    return const StudyCallWindowResult(
      opened: false,
      message: 'Allow pop-ups to open the study call window.',
    );
  }

  final dynamic document = popup.document;
  if (document == null) {
    return const StudyCallWindowResult(
      opened: false,
      message: 'Unable to prepare the study call window.',
    );
  }

  document
    ..open()
    ..write(
      _buildStudyCallHtml(
        roomTitle: roomTitle,
        focus: focus,
        schedule: schedule,
        participants: normalizedParticipants,
        accentHex: accentHex,
      ),
    )
    ..close();

  popup.focus();
  return const StudyCallWindowResult(opened: true);
}

String _buildStudyCallHtml({
  required String roomTitle,
  required String focus,
  required String schedule,
  required List<String> participants,
  required String accentHex,
}) {
  final safeTitle = _escapeHtml(roomTitle);
  final safeFocus = _escapeHtml(focus);
  final safeSchedule = _escapeHtml(schedule);
  final spotlightName = participants.length > 1
      ? participants[1]
      : participants[0];

  final participantTiles = participants
      .map(
        (name) => _buildParticipantTile(
          name: name,
          accentHex: accentHex,
          isYou: name == 'You',
          emphasized: name == spotlightName,
        ),
      )
      .join();

  final participantList = participants
      .map(
        (name) =>
            '''
          <div class="participant-row">
            <div class="participant-avatar">${_escapeHtml(_initials(name))}</div>
            <div>
              <div class="participant-name">${_escapeHtml(name)}</div>
              <div class="participant-status">${name == 'You' ? 'Ready' : 'Connected'}</div>
            </div>
          </div>
        ''',
      )
      .join();

  final chatItems =
      <String>[
            '${participants.first}: Ready when everyone is in.',
            '$spotlightName: Let us kick off with the room agenda.',
            'Primoria Bot: Screen sharing and notes sync are ready.',
          ]
          .map(
            (message) =>
                '<div class="chat-bubble">${_escapeHtml(message)}</div>',
          )
          .join();

  return '''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$safeTitle • Primoria Call</title>
  <style>
    :root {
      --accent: $accentHex;
      --accent-soft: ${accentHex}1f;
      --bg: #0b1020;
      --panel: #12192d;
      --panel-soft: #18203a;
      --border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --muted: #94a3b8;
      --danger: #ef4444;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(99, 102, 241, 0.25), transparent 34%),
        radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.16), transparent 28%),
        var(--bg);
      color: var(--text);
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 20px;
      padding: 20px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      padding: 18px 22px;
      border-radius: 24px;
      background: rgba(18, 25, 45, 0.88);
      border: 1px solid var(--border);
      backdrop-filter: blur(16px);
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .eyebrow-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
    }

    .title {
      margin: 8px 0 0;
      font-size: 32px;
      font-weight: 800;
      line-height: 1.05;
    }

    .subtitle {
      margin: 10px 0 0;
      font-size: 14px;
      color: var(--muted);
    }

    .topbar-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .meta-pill {
      padding: 12px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
    }

    .content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 20px;
      min-height: 0;
    }

    .stage {
      display: grid;
      gap: 18px;
      min-height: 0;
    }

    .spotlight {
      position: relative;
      min-height: 340px;
      border-radius: 28px;
      padding: 28px;
      background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 28%),
        linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(15, 23, 42, 0.9)),
        var(--panel);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .spotlight-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
    }

    .spotlight-badge::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 12px ${accentHex}aa;
    }

    .spotlight-name {
      margin-top: 18px;
      font-size: 38px;
      font-weight: 800;
      line-height: 1.05;
    }

    .spotlight-copy {
      margin-top: 10px;
      max-width: 420px;
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
    }

    .spotlight-orb {
      position: absolute;
      right: 32px;
      bottom: 28px;
      width: 190px;
      height: 190px;
      display: grid;
      place-items: center;
      border-radius: 36px;
      background:
        radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.3), transparent 34%),
        linear-gradient(135deg, $accentHex, #22d3ee);
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.4);
      font-size: 58px;
      font-weight: 800;
    }

    .participant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
    }

    .tile {
      padding: 18px;
      border-radius: 24px;
      background: rgba(18, 25, 45, 0.88);
      border: 1px solid var(--border);
      min-height: 170px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
    }

    .tile.emphasized {
      border-color: ${accentHex}66;
      box-shadow: 0 20px 46px rgba(99, 102, 241, 0.16);
    }

    .tile-badge {
      align-self: flex-start;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .tile-avatar {
      width: 66px;
      height: 66px;
      display: grid;
      place-items: center;
      border-radius: 20px;
      background: linear-gradient(135deg, ${accentHex}44, rgba(255, 255, 255, 0.12));
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
    }

    .tile-name {
      font-size: 20px;
      font-weight: 800;
    }

    .tile-status {
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .sidebar {
      display: grid;
      gap: 18px;
    }

    .panel {
      padding: 18px;
      border-radius: 24px;
      background: rgba(18, 25, 45, 0.88);
      border: 1px solid var(--border);
    }

    .panel-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .panel-body {
      margin-top: 16px;
    }

    .focus-card {
      padding: 16px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .focus-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .focus-copy {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }

    .participant-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .participant-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .participant-avatar {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.08);
      font-size: 14px;
      font-weight: 800;
    }

    .participant-name {
      font-size: 14px;
      font-weight: 700;
    }

    .participant-status {
      font-size: 12px;
      color: var(--muted);
      margin-top: 3px;
    }

    .chat-bubble {
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.55;
      margin-bottom: 10px;
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
      padding-bottom: 12px;
    }

    .control {
      min-width: 132px;
      padding: 14px 18px;
      border: none;
      border-radius: 18px;
      background: rgba(18, 25, 45, 0.92);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
    }

    .control:hover {
      transform: translateY(-1px);
      border-color: ${accentHex}66;
    }

    .control.active {
      background: ${accentHex}22;
      border-color: ${accentHex}88;
    }

    .control.danger {
      background: rgba(239, 68, 68, 0.16);
      border-color: rgba(239, 68, 68, 0.42);
      color: #fecaca;
    }

    @media (max-width: 1120px) {
      .content {
        grid-template-columns: 1fr;
      }

      .sidebar {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div>
        <div class="eyebrow"><span class="eyebrow-dot"></span> Primoria group call</div>
        <div class="title">$safeTitle</div>
        <div class="subtitle">$safeSchedule • ${participants.length} participants connected</div>
      </div>
      <div class="topbar-meta">
        <div class="meta-pill">Focus: $safeFocus</div>
        <div class="meta-pill">Layout: Zoom-style meeting</div>
      </div>
    </header>

    <div class="content">
      <section class="stage">
        <div class="spotlight">
          <div class="spotlight-badge">Active speaker</div>
          <div class="spotlight-name">${_escapeHtml(spotlightName)}</div>
          <div class="spotlight-copy">This room now behaves like a pop-out group call manager with live participants, a meeting stage, quick controls, and a side panel for chat and room context.</div>
          <div class="spotlight-orb">${_escapeHtml(_initials(spotlightName))}</div>
        </div>
        <div class="participant-grid">$participantTiles</div>
      </section>

      <aside class="sidebar">
        <section class="panel">
          <div class="panel-title">Call details</div>
          <div class="panel-body">
            <div class="focus-card">
              <div class="focus-label">Room agenda</div>
              <div class="focus-copy">$safeFocus</div>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-title">Participants</div>
          <div class="panel-body">$participantList</div>
        </section>
        <section class="panel">
          <div class="panel-title">Room chat</div>
          <div class="panel-body">$chatItems</div>
        </section>
      </aside>
    </div>

    <div class="controls">
      <button class="control active" data-toggle="Mute">Mic on</button>
      <button class="control active" data-toggle="Camera">Camera on</button>
      <button class="control" data-toggle="Share">Share screen</button>
      <button class="control" data-toggle="Chat">Chat panel</button>
      <button class="control danger" id="leave-call">Leave call</button>
    </div>
  </div>

  <script>
    document.querySelectorAll('[data-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
      });
    });

    document.getElementById('leave-call').addEventListener('click', () => {
      window.close();
    });
  </script>
</body>
</html>
''';
}

String _buildParticipantTile({
  required String name,
  required String accentHex,
  required bool isYou,
  required bool emphasized,
}) {
  final safeName = _escapeHtml(name);
  final status = isYou
      ? 'Host • Mic on • Camera on'
      : 'Connected • Ready to collaborate';
  final badge = isYou
      ? 'You'
      : emphasized
      ? 'On stage'
      : 'Member';

  return '''
    <article class="tile${emphasized ? ' emphasized' : ''}">
      <div class="tile-badge">$badge</div>
      <div class="tile-avatar">${_escapeHtml(_initials(name))}</div>
      <div>
        <div class="tile-name">$safeName</div>
        <div class="tile-status">${_escapeHtml(status)}</div>
      </div>
    </article>
  ''';
}

String _initials(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '?';
  final parts = trimmed
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList(growable: false);
  if (parts.length == 1) {
    final slice = parts.first.substring(0, parts.first.length >= 2 ? 2 : 1);
    return slice.toUpperCase();
  }
  final first = parts.first.substring(0, 1).toUpperCase();
  final second = parts.last.substring(0, 1).toUpperCase();
  return '$first$second';
}

String _escapeHtml(String value) {
  return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}
