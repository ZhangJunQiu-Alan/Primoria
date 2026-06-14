// FLOOR calibration (route B, 选项 4). FLOOR is the only absolute threshold:
// it decides whether a query is relevant to the graph at all (specific/broad vs
// fallback). Calibrate it cheaply from a handful of labelled in-domain vs
// out-of-domain goals — no large test set needed. Take each query's max recall
// similarity, then set FLOOR to separate the two groups.

export const FLOOR_CALIBRATION_QUERIES = {
  inDomain: [
    "链式法则",
    "怎么求极限",
    "泰勒公式",
    "变上限积分函数",
    "收敛半径",
    "隐函数求导",
  ],
  outOfDomain: [
    "今晚吃什么",
    "矩阵特征值", // linear algebra: out of THIS graph
    "牛顿第二定律",
    "怎么写简历",
    "python 列表推导式",
  ],
};

export type FloorSuggestion = {
  suggestedFloor: number;
  separable: boolean;
  inDomainMin: number;
  outOfDomainMax: number;
  margin: number;
};

/**
 * Given the max recall similarity for each in/out-domain sample, suggest FLOOR.
 * When the groups are separable, FLOOR is the midpoint of the gap; otherwise it
 * sits just above the out-of-domain max and the caller is warned via `separable`.
 */
export function suggestFloor(inDomainMaxSims: number[], outOfDomainMaxSims: number[]): FloorSuggestion {
  if (inDomainMaxSims.length === 0 || outOfDomainMaxSims.length === 0) {
    throw new Error("suggestFloor needs at least one sample in each group");
  }
  const inDomainMin = Math.min(...inDomainMaxSims);
  const outOfDomainMax = Math.max(...outOfDomainMaxSims);
  const separable = inDomainMin > outOfDomainMax;
  const suggestedFloor = separable
    ? (inDomainMin + outOfDomainMax) / 2
    : Number((outOfDomainMax + 0.01).toFixed(4));
  return {
    suggestedFloor: Number(suggestedFloor.toFixed(4)),
    separable,
    inDomainMin: Number(inDomainMin.toFixed(4)),
    outOfDomainMax: Number(outOfDomainMax.toFixed(4)),
    margin: Number((inDomainMin - outOfDomainMax).toFixed(4)),
  };
}
