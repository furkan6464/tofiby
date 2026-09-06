import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { polishChatReply, sanitizeAiSpeech } from "./aiSpeech";

const LEAK =
  'Harika bir hedef! Ancak şu an sistemimde "Fizik" adında bir hedef görünmüyor. Önce bu hedefi oluşturalım mı, yoksa mevcut hedeflerinden birine mi eklemek istersin? Eğer yeni bir hedefse, haftalık kaç gün ve günlük kaç dakika çalışmayı planlıyorsun? Bilgileri verirsen hemen `createGoal` ile ekleyebilirim. Mevcut hedeflerini görmek veya yeni bir tane oluşturmak için seni şuraya yönlendirebilirim: [hedeflerim](/hedeflerim)';

describe("sanitizeAiSpeech", () => {
  it("strips tool names and turns markdown routes into Git links", () => {
    const out = sanitizeAiSpeech(LEAK);
    assert.equal(out.text.includes("createGoal"), false);
    assert.equal(out.text.includes("`"), false);
    assert.equal(out.text.includes("[hedeflerim]"), false);
    assert.equal(out.text.includes("/hedeflerim"), false);
    assert.match(out.text, /hemen ekleyebilirim/);
    assert.deepEqual(out.links, [{ href: "/hedeflerim", label: "Hedefler" }]);
  });

  it("keeps polishChatReply tool calls while cleaning reply", () => {
    const out = polishChatReply({
      reply: "Tamam, createTask ile ekleyebilirim [takvim](/takvim)",
      links: [],
      calendarAdds: [],
      toolCalls: [{ id: "1", name: "createTask", args: { title: "Fizik" } }],
    });
    assert.equal(out.reply.includes("createTask"), false);
    assert.equal(out.toolCalls[0].name, "createTask");
    assert.equal(out.links[0]?.href, "/takvim");
  });
});
