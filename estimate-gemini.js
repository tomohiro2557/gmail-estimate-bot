// ========================
// 固定テンプレ
// ========================
const INPUT_TEXT_TEMPLATE =
  `件名：{{subject}}
本文：
{{bodyForGemini}}`;

const SLACK_TEXT_TEMPLATE =
  `📩 *見積依頼を受信しました*
*件名:* {{subject}}
*From:* {{from}}
*日時:* {{dateStr}}

:page_facing_up: *【依頼メール本文】*
\`\`\`{{bodyForSlack}}\`\`\`

:money_with_wings: *【回答案】*
{{summary}}`;

// ========================
// 固定設定
// ========================
const TARGET_LABEL = "ESTIMATE";
const DONE_LABEL = "DONE_ESTIMATE";
const MAX_THREADS = 10;
const MAX_BODY_FOR_SLACK = 2500;
const MAX_BODY_FOR_GEMINI = 6000;

const GEMINI_MODEL = "models/gemini-2.5-flash-lite-preview-09-2025";
const GENERATION_CONFIG = {
  temperature: 0.0,
  topP: 0.8,
  maxOutputTokens: 2000
};

// ========================

function pollEstimateLabelAndNotifySlack() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");
  const webhookUrl = props.getProperty("SLACK_WEBHOOK_URL");
  if (!apiKey) throw new Error("GEMINI_API_KEY 未設定");
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL 未設定");

  const promptTemplate = loadPromptFromDrive_();

  const doneLabel =
    GmailApp.getUserLabelByName(DONE_LABEL) ||
    GmailApp.createLabel(DONE_LABEL);

  const query = `label:${TARGET_LABEL} -label:${DONE_LABEL} newer_than:7d`;
  const threads = GmailApp.search(query, 0, MAX_THREADS);

  for (const thread of threads) {
    const msg = thread.getMessages().slice(-1)[0];

    const subject = msg.getSubject();
    const from = msg.getFrom();
    const date = msg.getDate();
    const dateStr = Utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd HH:mm");

    const cleanedBody = (msg.getPlainBody() || "")
      .split(/\nOn .* wrote:\n/i)[0]
      .replace(/^>.*$/gm, "")
      .trim();

    const bodyForGemini = cleanedBody.slice(0, MAX_BODY_FOR_GEMINI);
    const bodyForSlack =
      cleanedBody.slice(0, MAX_BODY_FOR_SLACK) +
      (cleanedBody.length > MAX_BODY_FOR_SLACK ? "\n...(省略)" : "");

    const inputText = render_(INPUT_TEXT_TEMPLATE, {
      subject,
      bodyForGemini
    });

    try {
      const summary = summarizeWithGemini_(
        apiKey,
        promptTemplate,
        inputText
      );

      const slackText = render_(SLACK_TEXT_TEMPLATE, {
        subject,
        from,
        dateStr,
        bodyForSlack,
        summary
      });

      postToSlack_(webhookUrl, slackText);

      thread.addLabel(doneLabel);
      thread.markRead();

    } catch (e) {
      console.error("Failed:", e);
    }
  }
}

// ========================
// DriveからPROMPTだけ読む
// ========================
function loadPromptFromDrive_() {
  const props = PropertiesService.getScriptProperties();
  const fileId = props.getProperty("CONFIG_FILE_ID");
  if (!fileId) throw new Error("CONFIG_FILE_ID 未設定");

  return DriveApp.getFileById(fileId)
    .getBlob()
    .getDataAsString("UTF-8")
    .trim();
}

// ========================
function render_(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ========================
function summarizeWithGemini_(apiKey, promptTemplate, inputText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = promptTemplate.replace("{{inputText}}", inputText);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: GENERATION_CONFIG
  };

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(res.getContentText());
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "(no output)";
}

// ========================
function postToSlack_(webhookUrl, text) {
  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ text })
  });
}


