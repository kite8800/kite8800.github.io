(function (Scratch) {
    "use strict";

    class WebSTT {
        constructor(runtime) {
            this.runtime = runtime;
            this.recognition = null;  // 单一识别实例
            this.result = "";         // 共用结果存储
        }

        getInfo() {
            const langs = {
                "Arabic - EG": "ar-EG", "Catalan - ES": "ca-ES", "Danish - DK": "da-DK",
                "German - DE": "de-DE", "English - AU": "en-AU", "English - CA": "en-CA",
                "English - GB": "en-GB", "English - IN": "en-IN", "English - NZ": "en-NZ",
                "English - US": "en-US", "Spanish - ES": "es-ES", "Spanish - MX": "es-MX",
                "Finnish - FI": "fi-FI", "French - CA": "fr-CA", "French - FR": "fr-FR",
                "Hindi - IN": "hi-IN", "Italian - IT": "it-IT", "Japanese - JP": "ja-JP",
                "Korean - KR": "ko-KR", "Norwegian - NO": "nb-NO", "Dutch - NL": "nl-NL",
                "Polish - PL": "pl-PL", "Portuguese - BR": "pt-BR", "Portuguese - PT": "pt-PT",
                "Russian - RU": "ru-RU", "Swedish - SE": "sv-SE", "Chinese - CN": "zh-CN",
                "Chinese - HK": "zh-HK", "Chinese - TW": "zh-TW"
            };
            const languageArr = Object.entries(langs).map(([t, v]) => ({ text: t, value: v }));
            return {
                id: "WebSTT",
                name: "语音识别",
                blocks: [
                    // 流式
                    { opcode: "startStream", blockType: Scratch.BlockType.COMMAND, text: "流式识别 开始 语言 [LANG]", arguments: { LANG: { type: Scratch.ArgumentType.STRING, menu: "languages", defaultValue: "zh-CN" } } },
                    // 一次性
                    { opcode: "startOnce",   blockType: Scratch.BlockType.COMMAND, text: "一次性识别 语言 [LANG]", arguments: { LANG: { type: Scratch.ArgumentType.STRING, menu: "languages", defaultValue: "zh-CN" } } },
                    { opcode: "stop",        blockType: Scratch.BlockType.COMMAND, text: "停止识别" },
                    // 共享
                    { opcode: "getResult",   blockType: Scratch.BlockType.REPORTER, text: "识别结果" },
                    { opcode: "clear",       blockType: Scratch.BlockType.COMMAND, text: "清空结果" },
                    { opcode: "whenHeard",   blockType: Scratch.BlockType.HAT,      text: "当听到 [TEXT]", arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" } } }
                ],
                menus: {
                    languages: { items: languageArr, acceptReporters: true }
                }
            };
        }

        _createRecognizer(lang, continuous) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return null;
            const r = new SR();
            r.lang = lang;
            r.continuous = continuous;
            r.interimResults = false;
            return r;
        }

        startStream({ LANG }) {
            this.clear();
            if (this.recognition) this.recognition.stop();
            this.recognition = this._createRecognizer(LANG, true);
            if (!this.recognition) return;
            this.recognition.onresult = e => {
                // 累积每次输出
                let t = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    t += e.results[i][0].transcript;
                }
                this.result += t;
            };
            this.recognition.onend = () => this.runtime.emitMicListening(false);
            this.recognition.start();
            this.runtime.emitMicListening(true);
        }

        startOnce({ LANG }) {
            this.clear();
            if (this.recognition) this.recognition.stop();
            this.recognition = this._createRecognizer(LANG, false);
            if (!this.recognition) return;
			return new Promise(resolve => {
				//this.recognition.onresult = e => {
				//    this.result = e.results[0][0].transcript.trim();
				//};
				this.recognition.onresult = e => {
					if (e.results.length > 0) {
						this.result = e.results[0][0].transcript.trim();
						resolve();
					}
				};
				this.recognition.onerror = e => {
					//this.result = "[识别出错]";
					resolve();
				};
				this.recognition.onend = () => this.runtime.emitMicListening(false);
				this.recognition.start();
				this.runtime.emitMicListening(true);
			});
        }

        stop() {
            if (!this.recognition) return;
            this.recognition.stop();
            this.recognition = null;
            this.runtime.emitMicListening(false);
        }

        getResult() {
            return this.result;
        }

        clear() {
            this.result = "";
        }

        whenHeard({ TEXT }) {
            return this.result.includes(TEXT);
        }
    }

    Scratch.extensions.register(new WebSTT(Scratch.vm.runtime));
})(Scratch);
