import { tool } from "@langchain/core/tools";
import { RenderChatQuizArgsSchema } from "@primoria/contracts/artifacts/schemas";

export const renderChatQuizTool = tool(
  async ({ title, description, questions }) => {
    return JSON.stringify({
      type: "chat_quiz",
      title,
      description,
      questions,
    });
  },
  {
    name: "render_chat_quiz",
    description:
      "Render a temporary interactive quiz directly inside the chat. Use this in COURSE DETAIL MODE when the learner asks for a quiz / test / practice / 测验 / 测试 / 练习题 / 考考我 / 出题 / 自测 about the current course or selected block. The quiz is not added to the course outline, is not a course block, and does not update mastery. Return concise, answerable questions grounded in the course context. Do not also write the questions as plain text.",
    schema: RenderChatQuizArgsSchema,
    returnDirect: true,
  },
);
