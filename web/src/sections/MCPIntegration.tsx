const smsExample = `// Lease a number
get_number({ "duration_hours": 2 })
// → { "numberId": "9a87d2a4-…", "phoneNumber": "+15550100001",
//     "expiresAt": "2026-10-06T12:48:54.024Z" }

// Text a customer from it (1 credit)
send_sms({
  "number_id": "9a87d2a4-…",
  "to": "+15557654321",
  "message": "Reminder: your appointment is Tuesday at 10am."
})
// → { "messageId": "cdc2295f-…", "status": "queued", "mock": false }

// Read replies
get_messages({ "number_id": "9a87d2a4-…" })`;

const voiceExample = `// Start a call with a goal
make_voice_call({
  "to": "+15557654321",
  "mission": "Book a cleaning for Friday afternoon",
  "caller_name": "Dana Smith",
  "style": "friendly"
})
// → { "callId": "f418bcfb-…", "status": "in-progress",
//     "fromNumber": "+15550100001", "mock": false }

// Poll for the outcome
get_call_result({ "call_id": "f418bcfb-…" })
// → { "status": "completed", "durationSeconds": 95,
//     "transcript": "Agent: Hi, I'm an AI assistant…",
//     "summary": "…", "creditsUsed": 10 }`;

function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-white/30 font-mono ml-2">{title}</span>
      </div>
      <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto text-white/70">
        <code>
          {code.split('\n').map((line, i) => (
            <span key={i} className={line.trimStart().startsWith('//') ? 'token-comment' : undefined}>
              {line}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const tools = [
  ['get_number', 'Lease a number from the pool'],
  ['send_sms', 'Send an SMS from a leased number'],
  ['get_messages', 'Read inbound and outbound SMS'],
  ['release_number', 'Return a number to the pool'],
  ['check_balance', 'Remaining credits'],
  ['make_voice_call', 'Start an AI voice call with a goal'],
  ['get_call_result', 'Status, transcript, and summary'],
];

export default function MCPIntegration() {
  return (
    <section id="mcp" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          <span className="text-cyan glow-cyan">MCP</span> Tools
        </h2>
        <p className="text-white/40 text-center mb-12 text-lg max-w-2xl mx-auto">
          Any MCP client, such as Claude Desktop or Claude Code, can use RingTask through seven tools. A mock mode
          lets you try every tool locally without Twilio or Retell credentials.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
          {tools.map(([name, desc]) => (
            <div key={name} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="font-mono text-sm text-cyan mb-1">{name}</div>
              <div className="text-xs text-white/40">{desc}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <CodeCard title="sms.mcp" code={smsExample} />
          <CodeCard title="voice.mcp" code={voiceExample} />
        </div>
      </div>
    </section>
  );
}
