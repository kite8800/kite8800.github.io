class Speech2TextExtension {
    constructor() {
        // 识别状态
        this.result = '';
        this.isListening = false;
        this.language = 'zh-CN';
        this.recognition = null;
        
        // 初始化识别器
        this.initializeRecognition();
    }

    // 初始化语音识别
    initializeRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.language;
        
        // 事件处理
        this.recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];
            
            if (lastResult.isFinal) {
                this.result = lastResult[0].transcript.trim();
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
        };
    }

    getInfo() {
        return {
            id: 'speech2text',
            name: '语音识别',
            color1: '#4C97FF',
            color2: '#3373CC',
            blocks: [
                {
                    opcode: 'startListening',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '开始语音识别'
                },
                {
                    opcode: 'stopListening',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '停止语音识别'
                },
                {
                    opcode: 'getResult',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '语音识别结果'
                },
                {
                    opcode: 'clearResult',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '清除识别结果'
                },
                {
                    opcode: 'setLanguage',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '设置语言为 [LANG]',
                    arguments: {
                        LANG: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'zh-CN'
                        }
                    }
                },
                {
                    opcode: 'isListening',
                    blockType: Scratch.BlockType.BOOLEAN,
                    text: '正在识别语音？'
                },
                {
                    opcode: 'checkContains',
                    blockType: Scratch.BlockType.BOOLEAN,
                    text: '结果包含 [TEXT]？',
                    arguments: {
                        TEXT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '你好'
                        }
                    }
                }
            ]
        };
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
            this.isListening = true;
        } catch (error) {
            console.error('启动语音识别失败:', error);
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        
        try {
            this.recognition.stop();
            this.isListening = false;
        } catch (error) {
            console.error('停止语音识别失败:', error);
        }
    }

    getResult() {
        return this.result;
    }

    clearResult() {
        this.result = '';
    }

    setLanguage(args) {
        this.language = args.LANG;
        if (this.recognition) {
            this.recognition.lang = this.language;
        }
    }

    isListening() {
        return this.isListening;
    }

    checkContains(args) {
        return this.result.toLowerCase().includes(
            String(args.TEXT).toLowerCase()
        );
    }
}

// 注册插件
Scratch.extensions.register(new Speech2TextExtension());