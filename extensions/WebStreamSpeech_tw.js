(function (Scratch) {
    "use strict";

	// Author: kitedriver
	// —— Web Speech API 流式识别扩展 —— 
    class StreamSpeech {
        constructor(runtime) {
            this.runtime = runtime;
            this.recognition = null;
            this.result = "";
            this._onResult = null;

            // 语言菜单
            this.languageObj = {
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
            this.languageArr = Object.entries(this.languageObj)
                .map(([text, value]) => ({ text, value }));
        }

        getInfo() {
            return {
                id: "streamSpeech",
                name: "流式识别",
                blocks: [
                    {
                        opcode: "startStream",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "开始识别 语言 [LANG]",
                        arguments: {
                            LANG: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "languageArr",
                                defaultValue: "zh-CN"
                            }
                        }
                    },
                    {
                        opcode: "stopStream",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "停止识别"
                    },
                    {
                        opcode: "getPartial",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "当前识别文本"
                    },
                    {
                        opcode: "clear",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "清空文本"
                    },
                    {
                        opcode: "whenHeard",
                        blockType: Scratch.BlockType.HAT,
                        text: "当听到 [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" }
                        }
                    }
                ],
                menus: {
                    languageArr: { items: this.languageArr, acceptReporters: true }
                }
            };
        }

        startStream({ LANG }) {
            if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
                console.warn("浏览器不支持 Web Speech API");
                return;
            }
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SR();
            this.recognition.lang = LANG;
            this.recognition.interimResults = false;
            this.recognition.continuous = true;

            this.recognition.onresult = e => {
                // 从 resultIndex 开始，累积所有新段落
                let transcript = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                this.result += transcript;
                this._onResult && this._onResult(transcript);
            };
            this.recognition.onerror = evt => {
                console.error("识别出错", evt.error);
            };
            this.recognition.onend = () => {
                // 用户没有调用 stopStream 而自动结束时，也关闭图标
                this.runtime.emitMicListening(false);
            };

            this.recognition.start();
            this.runtime.emitMicListening(true);
        }

        stopStream() {
            if (this.recognition) {
                this.recognition.stop();
                this.recognition = null;
                this.runtime.emitMicListening(false);
            }
        }

        getPartial() {
            return this.result;
        }

        clear() {
            this.result = "";
        }

        whenHeard({ TEXT }) {
            return this.result.includes(TEXT);
        }

        /** 示例：通过 Promise 等待某个关键词出现 */
        async untilHeard({ TEXT, TIMEOUT }) {
            this.clear();
            this.startStream({ LANG: "zh-CN" });
            return new Promise((resolve, reject) => {
                this._onResult = partial => {
                    if (this.result.includes(TEXT)) {
                        this.stopStream();
                        resolve(this.result);
                    }
                };
                setTimeout(() => {
                    this.stopStream();
                    reject(new Error("超时未听到"));
                }, TIMEOUT * 1000);
            });
        }
    }

    Scratch.extensions.register(new StreamSpeech(Scratch.vm.runtime));
})(Scratch);
