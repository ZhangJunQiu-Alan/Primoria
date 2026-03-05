-- ============================================================
-- Achievement seed data (16 achievements across 4 categories)
-- ============================================================

INSERT INTO achievements (slug, name, description, category, rarity) VALUES
  -- 🔥 Streak
  ('streak_3',    '三天打鱼',   '连续3天坚持每日学习',          'streak',    'common'),
  ('streak_7',    '一周无休',   '连续7天坚持每日学习',          'streak',    'rare'),
  ('streak_30',   '月度传奇',   '连续30天坚持每日学习',         'streak',    'epic'),
  ('streak_100',  '铁人',       '连续100天坚持每日学习',        'streak',    'legendary'),

  -- 📚 Learning
  ('first_lesson', '初来乍到',  '完成第1节课程',                'learning',  'common'),
  ('first_course', '破冰者',    '完成第1门完整课程',            'learning',  'common'),
  ('courses_5',   '知识探索者', '完成5门课程',                  'learning',  'rare'),
  ('multi_subject','全科霸主',  '在3个不同学科各完成1门课程',   'learning',  'rare'),
  ('lessons_100', '百课达人',   '累计完成100节课',              'learning',  'epic'),
  ('courses_50',  '学神',       '完成50门完整课程',             'learning',  'legendary'),

  -- ⚡ Challenge
  ('perfect_lesson','完美主义者','单课所有题目全部答对',         'challenge', 'common'),
  ('perfect_5',   '满分狂人',   '连续5节课全部答对',            'challenge', 'rare'),
  ('speed_lesson', '闪电侠',    '15分钟内完成一节完整课程',     'challenge', 'rare'),
  ('daily_tasks_30','任务达人', '累计30天完成每日全部任务',     'challenge', 'epic'),

  -- 🌟 Social
  ('first_follow', '交到朋友',  '关注第1个用户',                'social',    'common'),
  ('followers_10', '人气选手',  '获得10个粉丝',                 'social',    'rare')

ON CONFLICT (slug) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    rarity      = EXCLUDED.rarity;
