-- Strip legacy interactive-visual block fields from lessons.content_json.
--
-- Background: the interactive-visual block formerly carried multiple
-- competing "engine" + "runtime" shapes (physics-canvas wave params,
-- r3f-cell-3d placeholder, gemini-html5 alias, legacyCustomHtml fallback,
-- plus the unused initialState/controls/formulas/scene placeholders from
-- the original animation-block migration). After consolidating to a
-- single html-iframe renderer, only generatedHtml is meaningful; the rest
-- is dead weight that would otherwise leak back into the editor / generation
-- pipeline.
--
-- This migration walks every lessons.content_json blob and removes those
-- keys from the `content` object of any block whose type is
-- 'interactive-visual'. Other block types and surrounding metadata are
-- untouched.

create or replace function pg_temp.iv_strip_legacy_fields(input jsonb)
  returns jsonb
  language plpgsql
  immutable
as $$
declare
  result jsonb;
  k text;
  v jsonb;
  arr jsonb;
  elem jsonb;
begin
  if input is null then
    return null;
  end if;

  if jsonb_typeof(input) = 'object' then
    result := '{}'::jsonb;
    for k, v in select * from jsonb_each(input) loop
      if input ->> 'type' = 'interactive-visual' and k = 'content' and jsonb_typeof(v) = 'object' then
        result := result || jsonb_build_object(
          k,
          v
            - 'engine'
            - 'runtime'
            - 'legacyCustomHtml'
            - 'legacy_custom_html'
            - 'initialState'
            - 'controls'
            - 'formulas'
            - 'scene'
            - 'layoutPreset'
            - 'mode'
        );
      else
        result := result || jsonb_build_object(k, pg_temp.iv_strip_legacy_fields(v));
      end if;
    end loop;
    return result;
  end if;

  if jsonb_typeof(input) = 'array' then
    arr := '[]'::jsonb;
    for elem in select * from jsonb_array_elements(input) loop
      arr := arr || jsonb_build_array(pg_temp.iv_strip_legacy_fields(elem));
    end loop;
    return arr;
  end if;

  return input;
end;
$$;

update lessons
set content_json = pg_temp.iv_strip_legacy_fields(content_json)
where content_json is not null;
