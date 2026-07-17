export const LEVELS = [
  { code: "novice_explorer", threshold: 0, zh: "见习探索者", en: "Novice Explorer" },
  { code: "seeker", threshold: 200, zh: "寻路者", en: "Seeker" },
  { code: "pathfinder", threshold: 600, zh: "开拓者", en: "Pathfinder" },
  { code: "rune_scholar", threshold: 1_400, zh: "符文研习者", en: "Rune Scholar" },
  { code: "lorekeeper", threshold: 2_800, zh: "典籍守卫", en: "Lorekeeper" },
  { code: "star_cartographer", threshold: 5_000, zh: "星图绘制师", en: "Star Cartographer" },
  { code: "grand_sage", threshold: 8_000, zh: "大贤者", en: "Grand Sage" },
  { code: "primoria_heir", threshold: 12_000, zh: "原境传承者", en: "Primoria Heir" },
] as const;

export type LevelCode = (typeof LEVELS)[number]["code"];

export const ACHIEVEMENTS = [
  { code: "first_expedition", category: "exploration", rarity: "bronze", xpReward: 50, zh: ["初次远征", "完成第一节课程。"], en: ["First Expedition", "Complete your first lesson."] },
  { code: "questline_complete", category: "exploration", rarity: "silver", xpReward: 150, zh: ["任务线完成", "完成第一门课程。"], en: ["Questline Complete", "Complete your first course."] },
  { code: "first_mastery", category: "mastery", rarity: "bronze", xpReward: 0, zh: ["初识奥义", "首次掌握一个概念。"], en: ["First Mastery", "Master your first concept."] },
  { code: "ten_masteries", category: "mastery", rarity: "gold", xpReward: 0, zh: ["十项奥义", "掌握十个不同概念。"], en: ["Tenfold Lore", "Master ten different concepts."] },
  { code: "remediation_complete", category: "recovery", rarity: "silver", xpReward: 75, zh: ["破局者", "完成第一节补救课程。"], en: ["Barrier Breaker", "Complete your first remediation lesson."] },
  { code: "perfect_trial", category: "mastery", rarity: "silver", xpReward: 0, zh: ["无瑕试炼", "在至少三道题的测验中取得满分。"], en: ["Flawless Trial", "Score perfectly on a quiz with at least three questions."] },
  { code: "streak_3", category: "consistency", rarity: "bronze", xpReward: 50, zh: ["三日守火", "连续三天完成每日任务。"], en: ["Three-Day Flame", "Complete a daily quest three days in a row."] },
  { code: "streak_7", category: "consistency", rarity: "gold", xpReward: 100, zh: ["七日长明", "连续七天完成每日任务。"], en: ["Seven-Day Beacon", "Complete a daily quest seven days in a row."] },
  { code: "comeback", category: "recovery", rarity: "silver", xpReward: 75, zh: ["归队者", "离开七天后重新完成每日任务。"], en: ["The Returner", "Complete a daily quest after at least seven days away."] },
  { code: "cross_concept", category: "mastery", rarity: "gold", xpReward: 0, zh: ["融会贯通", "在覆盖至少两个概念的三题测验中取得满分。"], en: ["Synthesis", "Perfect a three-question quiz spanning at least two concepts."] },
] as const;

export type AchievementCode = (typeof ACHIEVEMENTS)[number]["code"];
export type AchievementCategory = (typeof ACHIEVEMENTS)[number]["category"];
export type AchievementRarity = (typeof ACHIEVEMENTS)[number]["rarity"];

export const DAILY_QUESTS = [
  { code: "field_practice", target: 5, xpReward: 20, zh: ["实战训练", "完成 5 道不同题目"], en: ["Field Practice", "Complete 5 different questions"] },
  { code: "advance_quest", target: 1, xpReward: 30, zh: ["推进远征", "完成 1 节课程"], en: ["Advance the Expedition", "Complete 1 lesson"] },
  { code: "growth_trial", target: 1, xpReward: 40, zh: ["成长试炼", "完成补救、刷新最佳或掌握概念"], en: ["Growth Trial", "Recover, improve a best score, or master a concept"] },
] as const;

export type DailyQuestCode = (typeof DAILY_QUESTS)[number]["code"];

export function levelForXp(totalXp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXp < level.threshold) break;
    current = level;
  }
  const index = LEVELS.findIndex((level) => level.code === current.code);
  const next = LEVELS[index + 1] ?? null;
  return { current, next };
}

export function achievementByCode(code: AchievementCode) {
  return ACHIEVEMENTS.find((achievement) => achievement.code === code)!;
}

export function questByCode(code: DailyQuestCode) {
  return DAILY_QUESTS.find((quest) => quest.code === code)!;
}
