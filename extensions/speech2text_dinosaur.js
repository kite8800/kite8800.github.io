new (function() {
    var ext = this;
    var recognized_speech = '';
    var recognition = null;

    ext.recognize_speech = function(callback) {
        if (!window.webkitSpeechRecognition) return;

        recognition = new webkitSpeechRecognition();
        recognition.lang = 'zh-CN'; // 设置识别语言为中文
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback === "function") callback();
            }
        };

        recognition.onerror = function(event) {
            recognized_speech = "[识别出错]";
            if (typeof callback === "function") callback();
        };

        recognition.start();
    };

    ext.recognized_speech = function () {
        return recognized_speech;
    };

    ext._shutdown = function() {
        if (recognition) recognition.stop();
    };

    ext._getStatus = function() {
        if (window.webkitSpeechRecognition === undefined) {
            return {
                status: 1,
                msg: '你的浏览器不支持语音识别，请使用 Chrome 浏览器。'
            };
        }
        return { status: 2, msg: '准备好了' };
    };

    var descriptor = {
        blocks: [
            ['w', '等待并识别语音', 'recognize_speech'],
            ['r', '识别到的语音', 'recognized_speech']
        ]
    };

    ScratchExtensions.register('语音识别', descriptor, ext);
})();
