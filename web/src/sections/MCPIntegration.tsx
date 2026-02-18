export default function MCPIntegration() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          <span className="text-cyan glow-cyan">MCP</span> Native
        </h2>
        <p className="text-white/40 text-center mb-16 text-lg max-w-2xl mx-auto">
          Any AI agent framework — Claude, GPT, your custom stack — can use RingTask through MCP tool calls. No SDK needed.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Get a number + send SMS */}
          <div className="rounded-2xl border border-white/5 bg-[#111] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-white/30 font-mono ml-2">phone-numbers.mcp</span>
            </div>
            <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto">
              <code>
                <span className="token-comment">{'// Get a temp phone number'}</span>{'\n'}
                <span className="token-keyword">await</span>{' '}
                <span className="token-fn">mcp</span>
                <span className="token-bracket">.</span>
                <span className="token-fn">call</span>
                <span className="token-bracket">(</span>
                <span className="token-string">"ringtask"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-string">"get_number"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-bracket">{'{'}</span>{'\n'}
                {'  '}
                <span className="token-prop">country</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"US"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">type</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"temp"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">sms</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-keyword">true</span>{'\n'}
                <span className="token-bracket">{'}'}</span>
                <span className="token-bracket">)</span>{'\n\n'}
                <span className="token-comment">{'// → { number: "+1-555-0142", id: "ph_8x..." }'}</span>{'\n\n'}
                <span className="token-comment">{'// Send an SMS'}</span>{'\n'}
                <span className="token-keyword">await</span>{' '}
                <span className="token-fn">mcp</span>
                <span className="token-bracket">.</span>
                <span className="token-fn">call</span>
                <span className="token-bracket">(</span>
                <span className="token-string">"ringtask"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-string">"send_sms"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-bracket">{'{'}</span>{'\n'}
                {'  '}
                <span className="token-prop">from</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"ph_8x..."</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">to</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"+1-555-0199"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">body</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"Your code is 4829"</span>{'\n'}
                <span className="token-bracket">{'}'}</span>
                <span className="token-bracket">)</span>
              </code>
            </pre>
          </div>

          {/* Voice mission */}
          <div className="rounded-2xl border border-white/5 bg-[#111] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-white/30 font-mono ml-2">voice-missions.mcp</span>
            </div>
            <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto">
              <code>
                <span className="token-comment">{'// Launch a voice mission'}</span>{'\n'}
                <span className="token-keyword">await</span>{' '}
                <span className="token-fn">mcp</span>
                <span className="token-bracket">.</span>
                <span className="token-fn">call</span>
                <span className="token-bracket">(</span>
                <span className="token-string">"ringtask"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-string">"make_voice_call"</span>
                <span className="token-bracket">,</span>{' '}
                <span className="token-bracket">{'{'}</span>{'\n'}
                {'  '}
                <span className="token-prop">to</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"+1-555-0123"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">mission</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"Book a table for 2 at 7pm Friday"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">voice</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-string">"friendly"</span>
                <span className="token-bracket">,</span>{'\n'}
                {'  '}
                <span className="token-prop">max_duration</span>
                <span className="token-bracket">:</span>{' '}
                <span className="token-number">120</span>{'\n'}
                <span className="token-bracket">{'}'}</span>
                <span className="token-bracket">)</span>{'\n\n'}
                <span className="token-comment">{'// → {'}</span>{'\n'}
                <span className="token-comment">{'//   status: "completed",'}</span>{'\n'}
                <span className="token-comment">{'//   duration: 47,'}</span>{'\n'}
                <span className="token-comment">{'//   transcript: "Hi, I\'d like...",'}</span>{'\n'}
                <span className="token-comment">{'//   summary: "Reserved: 2 ppl, Fri 7pm",'}</span>{'\n'}
                <span className="token-comment">{'//   recording_url: "https://..."'}</span>{'\n'}
                <span className="token-comment">{'// }'}</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
