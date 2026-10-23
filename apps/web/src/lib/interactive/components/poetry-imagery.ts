import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { poemId: z.enum(["autumn-thoughts", "stork-tower", "quiet-night"]), view: z.enum(["scene", "evidence", "classify", "complete"]), focus: z.enum(["imagery", "structure", "emotion"]), showTranslation: z.boolean() };
export const PoetryImageryConfigSchema = z.object({ poemId: fields.poemId.default("autumn-thoughts"), view: fields.view.default("scene"), focus: fields.focus.default("imagery"), showTranslation: fields.showTranslation.default(true) }).strict();
export const PoetryImageryPatchSchema = z.object(fields).partial().strict();
export type PoetryImageryConfig = z.infer<typeof PoetryImageryConfigSchema>;
export const DEFAULT_POETRY_IMAGERY_CONFIG = PoetryImageryConfigSchema.parse({});
type Bilingual = readonly [string, string];
type PoetryPhrase = { id: string; line: number; quote: string; group: string; observation: Bilingual; effect: Bilingual };
type PoetryScene = { title: Bilingual; author: Bilingual; lines: readonly string[]; translation: readonly string[]; groups: readonly { id: string; label: Bilingual; description: Bilingual }[]; phrases: readonly PoetryPhrase[]; structure: Bilingual; interpretation: Bilingual };

export const POETRY_SCENES: Record<PoetryImageryConfig["poemId"], PoetryScene> = {
  "autumn-thoughts": {
    title: ["天净沙·秋思", "Autumn Thoughts · Tianjingsha"], author: ["马致远 · 元", "Ma Zhiyuan · Yuan dynasty"],
    lines: ["枯藤老树昏鸦", "小桥流水人家", "古道西风瘦马", "夕阳西下", "断肠人在天涯"],
    translation: ["Withered vines, old trees, crows in the dusk.", "A small bridge, flowing water, homes.", "An ancient road, a west wind, a lean horse.", "The evening sun sinks westward.", "A heartbroken traveller, far from home."],
    groups: [{ id: "bleak", label: ["暮色与旅途", "Dusk and the road"], description: ["衰老、寒凉、疲惫与时间流逝的景物线索。", "Details of age, chill, weariness and fading daylight."] }, { id: "home", label: ["安居的反衬", "Settled homes"], description: ["桥、水、人家可以构成安居图景，与行旅处境形成反衬。", "Bridge, stream and homes suggest settled life, contrasting with travel."] }, { id: "traveller", label: ["人的处境", "The traveller"], description: ["结尾直接点出情绪与远离家园的位置。", "The close names the emotion and the distance from home."] }],
    phrases: [
      { id: "vine", line: 0, quote: "枯藤", group: "bleak", observation: ["“枯”写出植物失去生机的状态。", "“Withered” describes vegetation without vitality."], effect: ["让秋景带上衰飒感。", "It lends the autumn scene a feeling of decline."] },
      { id: "tree", line: 0, quote: "老树", group: "bleak", observation: ["“老”强调岁月与树的形态。", "“Old” stresses age and weathered form."], effect: ["与枯藤并置，延续苍凉氛围。", "Beside withered vines, it sustains the bleak atmosphere."] },
      { id: "crow", line: 0, quote: "昏鸦", group: "bleak", observation: ["“昏”给出黄昏的时间线索。", "“Dusk” places the crows in the fading light."], effect: ["归巢联想可与旅人未归形成对照。", "The idea of returning birds can contrast with a traveller still away."] },
      { id: "bridge", line: 1, quote: "小桥", group: "home", observation: ["桥连接水的两岸，也属于人居环境。", "The bridge connects the banks within a lived-in setting."], effect: ["与“人家”共同构成可停驻的空间。", "Together with homes, it suggests a place to settle."] },
      { id: "stream", line: 1, quote: "流水", group: "home", observation: ["水在流动，给静态名词组合加入动感。", "Flowing water brings motion to the sequence of nouns."], effect: ["可读作清润的生活图景，与古道相对。", "It can suggest a gentle lived-in scene, set against the road."] },
      { id: "house", line: 1, quote: "人家", group: "home", observation: ["原句明确写到有人居住的地方。", "The words explicitly name inhabited homes."], effect: ["反衬天涯旅人缺少归属的处境。", "They contrast with the faraway traveller’s lack of belonging."] },
      { id: "road", line: 2, quote: "古道", group: "bleak", observation: ["道路是行旅的空间，“古”增加久远感。", "The road is a space of travel; “ancient” adds a sense of time."], effect: ["把画面从人家重新引向漂泊。", "It turns attention from settled homes back to wandering."] },
      { id: "wind", line: 2, quote: "西风", group: "bleak", observation: ["风提供触觉线索，并提示秋意。", "The wind adds a tactile detail associated with autumn."], effect: ["强化行旅的寒凉体验。", "It strengthens the chill of the journey."] },
      { id: "horse", line: 2, quote: "瘦马", group: "bleak", observation: ["“瘦”是马的形体特征。", "“Lean” is a physical detail of the horse."], effect: ["可以传达旅途的消耗与困顿。", "It can suggest the strain and hardship of travel."] },
      { id: "sun", line: 3, quote: "夕阳", group: "bleak", observation: ["太阳已到一天将尽之时。", "The sun places the scene near the end of the day."], effect: ["暮色收束前面景物，催动未归之感。", "The fading light gathers the scene and sharpens the feeling of being away."] },
      { id: "person", line: 4, quote: "断肠人", group: "traveller", observation: ["“断肠”直接命名强烈悲伤。", "“Heartbroken” directly names intense sorrow."], effect: ["由写景转向抒情主体。", "The poem turns from scenery to the feeling person."] },
      { id: "distance", line: 4, quote: "天涯", group: "traveller", observation: ["位置被写成遥远的天边。", "The location is imagined as the far edge of the world."], effect: ["距离感集中表现漂泊与思归。", "Distance concentrates the sense of wandering and longing for home."] },
    ],
    structure: ["前三句并列景物，第四句以夕阳收束时间，末句由景及人；“人家”与“天涯”形成空间和归属的对照。", "Three lines juxtapose images; sunset gathers the time setting, and the final line turns to the person. “Homes” and “far away” create a contrast of place and belonging."],
    interpretation: ["一种有文本证据的解读：以暮秋旅景表现羁旅愁思。景物本身不必天然悲伤，情感来自词语、并置关系和末句共同作用。", "One text-supported reading is homesick sorrow in an autumn journey. Objects are not inherently sad; the wording, juxtaposition and final line create the effect together."],
  },
  "stork-tower": {
    title: ["登鹳雀楼", "Climbing Stork Tower"], author: ["王之涣 · 唐", "Wang Zhihuan · Tang dynasty"], lines: ["白日依山尽", "黄河入海流", "欲穷千里目", "更上一层楼"],
    translation: ["The sun sinks beside the mountains.", "The Yellow River flows toward the sea.", "To see a thousand miles farther,", "Climb one more floor."],
    groups: [{ id: "landscape", label: ["眼前景物", "Visible landscape"], description: ["日、山、河提供空间与运动线索。", "Sun, mountains and river establish space and motion."] }, { id: "distance", label: ["视野的延伸", "Extending the view"], description: ["海与千里把视线推向远方。", "The sea and a thousand miles extend the imagined distance."] }, { id: "action", label: ["登高的行动", "The act of climbing"], description: ["愿望转成具体行动。", "A wish becomes a concrete action."] }],
    phrases: [
      { id: "sun", line: 0, quote: "白日", group: "landscape", observation: ["明亮的太阳与山并置。", "The bright sun is placed beside mountains."], effect: ["建立辽阔视野中的时间变化。", "It places the changing time within a broad view."] },
      { id: "mountain", line: 0, quote: "山", group: "landscape", observation: ["“依山尽”写日轮在山边隐没。", "The sun appears to sink beside the mountains."], effect: ["形成远景的轮廓和遮挡。", "The mountains shape the distant outline and occlusion."] },
      { id: "river", line: 1, quote: "黄河", group: "landscape", observation: ["“流”写出河水运动。", "“Flows” gives the river motion."], effect: ["与落日共同构成宏阔而变化的图景。", "The river joins the sunset in a wide, moving landscape."] },
      { id: "sea", line: 1, quote: "海", group: "distance", observation: ["海是河流延伸的去向。", "The sea is the destination toward which the river extends."], effect: ["把眼前所见连接到远方想象。", "It connects the visible scene to imagined distance."] },
      { id: "view", line: 2, quote: "千里目", group: "distance", observation: ["“千里”强调希望看得更远。", "“A thousand miles” stresses the wish to see farther."], effect: ["由看见景物转为拓展视野的愿望。", "Observation becomes a desire to widen the view."] },
      { id: "tower", line: 3, quote: "更上一层楼", group: "action", observation: ["“更上”写进一步登高。", "“One more floor” makes the upward action explicit."], effect: ["具体行动回应前句愿望，也可引出进取的理解。", "The action answers the wish and can support a reading of continued striving."] },
    ],
    structure: ["前两句写景，后两句写愿望和行动；“欲”与“更上”构成目的和方法的关系。", "The first pair presents scenery; the second presents a wish and an action. Wanting to see farther supplies a purpose, and climbing supplies the method."],
    interpretation: ["先从登楼所见理解原句，再讨论“登高望远”的启示；不能只保留抽象道理而丢掉日、山、河的具体画面。", "Begin with what is seen from the tower before discussing a broader lesson. An abstract moral should not erase the concrete sun, mountains and river."],
  },
  "quiet-night": {
    title: ["静夜思", "Thoughts on a Quiet Night"], author: ["李白 · 唐", "Li Bai · Tang dynasty"], lines: ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"],
    translation: ["Moonlight before the bed.", "Could it be frost on the ground?", "I lift my head toward the bright moon,", "Then lower it, thinking of home."],
    groups: [{ id: "light", label: ["光与联想", "Light and comparison"], description: ["月光引出似霜的视觉联想，并非确认地面结霜。", "Moonlight evokes frost; the poem does not confirm actual frost."] }, { id: "action", label: ["动作的转折", "Contrasting gestures"], description: ["举头与低头连接观看和思念。", "Lifting and lowering the head connect seeing and remembering."] }, { id: "place", label: ["此地与故乡", "Here and home"], description: ["眼前位置与心中远方形成联系。", "The present place connects with a home held in thought."] }],
    phrases: [
      { id: "bed", line: 0, quote: "床前", group: "place", observation: ["开篇落在人物身边的近处空间。", "The opening places the scene close to the speaker."], effect: ["让辽远月色进入个人体验。", "It brings distant moonlight into a personal experience."] },
      { id: "light", line: 0, quote: "明月光", group: "light", observation: ["月光是眼前所见。", "Moonlight is what the speaker sees."], effect: ["提供触发联想与思乡的起点。", "It starts the sequence of comparison and homesickness."] },
      { id: "frost", line: 1, quote: "地上霜", group: "light", observation: ["“疑是”表示猜想或恍惚的判断。", "“Could it be” signals an uncertain impression."], effect: ["突出月光的明亮与清冷，不把联想当作天气事实。", "It stresses the pale, cool light without establishing a weather fact."] },
      { id: "raise", line: 2, quote: "举头", group: "action", observation: ["动作指向仰望。", "The gesture directs the gaze upward."], effect: ["把地面的光线追溯到月亮。", "It follows the light on the ground back to the moon."] },
      { id: "moon", line: 2, quote: "明月", group: "light", observation: ["与首句月光形成照应。", "It echoes the moonlight in the first line."], effect: ["连接眼前景物与后面的内心活动。", "It links the visible scene with the inward turn that follows."] },
      { id: "lower", line: 3, quote: "低头", group: "action", observation: ["方向与“举头”相反。", "Its direction reverses the earlier gesture."], effect: ["把视线转向沉思，形成简洁转折。", "It turns outward looking into inward reflection."] },
      { id: "home", line: 3, quote: "故乡", group: "place", observation: ["“思”明确指向家乡。", "“Thinking” explicitly takes home as its object."], effect: ["点明前面景物和动作最终汇聚的情感。", "It names the feeling toward which the images and gestures lead."] },
    ],
    structure: ["见光—疑霜—举头—低头，观察与动作连成情绪转折；末句“思故乡”点明主题。", "Seeing light, imagining frost, looking up and looking down form a sequence from observation to feeling. The last line names the thought of home."],
    interpretation: ["一种有证据的解读是月夜思乡。“疑是”不能读成确有霜冻；动作和末句比单个意象更能约束解释。", "A supported reading is homesickness in moonlight. The uncertain comparison does not prove frost; the gestures and final line constrain interpretation more than an isolated image does."],
  },
};

export function gradePoetryClassification(poemId: PoetryImageryConfig["poemId"], phraseId: string, groupId: string) {
  const poem = POETRY_SCENES[poemId], phrase = poem.phrases.find((entry) => entry.id === phraseId);
  if (!phrase || !poem.groups.some((entry) => entry.id === groupId)) return null;
  return phrase.group === groupId;
}

export const poetryImageryComponent: ImplementedComponent = {
  implemented: true, componentId: "chinese.poetry-imagery", name: "诗词意象与文本证据", catalogDescription: "秋思、登鹳雀楼、静夜思的诗景、证据、意象归类与词语补全",
  configSchema: PoetryImageryConfigSchema, patchSchema: PoetryImageryPatchSchema,
  schemaDoc: "chinese.poetry-imagery config：poemId=autumn-thoughts|stork-tower|quiet-night默认autumn-thoughts；view=scene|evidence|classify|complete默认scene；focus=imagery|structure|emotion默认imagery；showTranslation默认true。内置三首公版古诗曲及独立解读，以原句、观察、表达效果的证据链学习意象。选词、练习答案和题号留在本地临时状态。无音频朗读或AI生成图片；绘景为解释性示意，不是真实地理复原。",
  patchHints: "天净沙·秋思→autumn-thoughts，登鹳雀楼→stork-tower，静夜思→quiet-night。补全/归类练习不改写原文。只支持这三首内置文本，其他诗文用文本细读或其他可信渲染器；不能虚构朗读能力。",
};
