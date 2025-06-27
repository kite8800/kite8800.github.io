
class TextToSpeechExtension {
    constructor() {
        this.voice = null;
        this.lang = 'en-US';
    }

    getInfo() {
        return {
            id: 'text2speech',
            name: 'Text to Speech',
            color1: '#ff6680',
            color2: '#ff3355',
            blocks: [
                {
                    opcode: 'speak',
                    blockType: 'command',
                    text: 'speak [TEXT]',
                    arguments: {
                        TEXT: {
                            type: 'string',
                            defaultValue: 'Hello, world!'
                        }
                    }
                },
                {
                    opcode: 'setLanguage',
                    blockType: 'command',
                    text: 'set language to [LANG]',
                    arguments: {
                        LANG: {
                            type: 'string',
                            menu: 'languages'
                        }
                    }
                }
            ],
            menus: {
                languages: {
                    acceptReporters: true,
                    items: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN']
                }
            }
        };
    }

    speak(args) {
        const utterance = new SpeechSynthesisUtterance(args.TEXT);
        if (this.voice) utterance.voice = this.voice;
        utterance.lang = this.lang;
        speechSynthesis.speak(utterance);
    }

    setLanguage(args) {
        this.lang = args.LANG;
        const voices = speechSynthesis.getVoices();
        const match = voices.find(v => v.lang === args.LANG);
        if (match) {
            this.voice = match;
        }
    }
}

Scratch.extensions.register(new TextToSpeechExtension());
