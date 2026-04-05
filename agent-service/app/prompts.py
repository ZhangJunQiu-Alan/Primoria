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

    context_prefix = 'Current viewer context:\n' + '\n'.join(context_lines) if context_lines else 'No viewer context provided.'

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
    return f'{context_prefix}\n\n{memory_prefix}\n\nLearner request:\n{message}'
