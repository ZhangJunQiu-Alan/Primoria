from app.schemas import ChatContext


def build_user_prompt(message: str, context: ChatContext, relevant_memories: list[dict] | None = None) -> str:
    context_lines = []
    if context.surface:
        context_lines.append(f'- surface: {context.surface}')
    if context.course_id:
        context_lines.append(f'- course_id: {context.course_id}')
    if context.lesson_id:
        context_lines.append(f'- lesson_id: {context.lesson_id}')
    if context.block_id:
        context_lines.append(f'- block_id: {context.block_id}')
    if context.locale:
        context_lines.append(f'- locale: {context.locale}')
    if context.lesson_title:
        context_lines.append(f'- lesson_title: {context.lesson_title}')
    if context.page_index is not None and context.page_count is not None:
        context_lines.append(f'- page: {context.page_index}/{context.page_count}')
    if context.page_title:
        context_lines.append(f'- page_title: {context.page_title}')
    if context.page_content:
        context_lines.append(f'- page_content:\n{context.page_content}')
    if context.learner_state:
        context_lines.append(f'- learner_state:\n{context.learner_state}')

    context_prefix = 'Current viewer context:\n' + '\n'.join(context_lines) if context_lines else 'No viewer context provided.'
    grounding_prefix = ''
    if context.surface == 'lesson-runtime':
        grounding_prefix = (
            'Lesson grounding rules:\n'
            '- Prioritize the visible current-page content and learner state.\n'
            '- Do not reveal hidden future questions, hidden explanations, or correct answers that are not already shown.\n'
            '- If the current page is insufficient for a page-specific claim, say that clearly before adding stable background knowledge.'
        )

    memory_lines = []
    for item in relevant_memories or []:
        content = str(item.get('content', '')).strip()
        if not content:
            continue
        kind = str(item.get('kind', 'note')).strip() or 'note'
        source = str(item.get('source', 'agent')).strip() or 'agent'
        memory_lines.append(f'- [{kind} via {source}] {content}')

    memory_prefix = (
        'Relevant learner memory:\n' + '\n'.join(memory_lines)
        if memory_lines
        else 'Relevant learner memory:\n- none'
    )

    sections = [context_prefix]
    if grounding_prefix:
        sections.append(grounding_prefix)
    sections.append(memory_prefix)
    sections.append(f'Learner request:\n{message}')
    return '\n\n'.join(sections)
