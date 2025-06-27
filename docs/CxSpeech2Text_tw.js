(function (Scratch) {
    "use strict";

	// Ported by kitedriver
    // ——— 1. WavResampler 类 ———
    class WavResampler {
        constructor(fromSampleRate, toSampleRate, channels, inputBufferSize) {
            if (!fromSampleRate || !toSampleRate || !channels) {
                throw new Error("Invalid settings specified for the resampler.");
            }
            this.fromSampleRate = fromSampleRate;
            this.toSampleRate = toSampleRate;
            this.channels = channels;
            this.inputBufferSize = inputBufferSize;
            this.initialize();
        }
        initialize() {
            if (this.fromSampleRate === this.toSampleRate) {
                this.resampler = data => data;
                this.ratioWeight = 1;
            } else {
                if (this.fromSampleRate < this.toSampleRate) {
                    this.linearInterpolation();
                    this.lastWeight = 1;
                } else {
                    this.multiTap();
                    this.tailExists = false;
                    this.lastWeight = 0;
                }
                this.initializeBuffers();
                this.ratioWeight = this.fromSampleRate / this.toSampleRate;
            }
        }
        initializeBuffers() {
            this.outputBufferSize =
                Math.ceil(this.inputBufferSize * this.toSampleRate / this.fromSampleRate / this.channels * 1.0000004768371582)
                + this.channels * 2;
            try {
                this.outputBuffer = new Float32Array(this.outputBufferSize);
                this.lastOutput = new Float32Array(this.channels);
            } catch {
                this.outputBuffer = [];
                this.lastOutput = [];
            }
        }
        bufferSlice(length) {
            try {
                return this.outputBuffer.subarray(0, length);
            } catch {
                this.outputBuffer.length = length;
                return this.outputBuffer;
            }
        }
        linearInterpolation() {
            const e = this;
            this.resampler = t => {
                const d = e.channels;
                let out = e.outputBuffer,
                    l = 0,
                    r = e.lastWeight,
                    o = e.ratioWeight,
                    c = t.length;
                if (c % d !== 0) throw new Error("Buffer was of incorrect sample length.");
                if (c <= 0) return [];
                // 前一帧尾部
                for (; r < 1; r += o) {
                    const a = r % 1, i = 1 - a;
                    e.lastWeight = a;
                    for (let A = 0; A < d; ++A) {
                        out[l++] = e.lastOutput[A] * i + t[A] * a;
                    }
                }
                r -= 1;
                c -= d;
                let s = Math.floor(r) * d;
                // 中间
                while (l < e.outputBufferSize && s < c) {
                    const a = r % 1, i = 1 - a;
                    for (let A = 0; A < d; ++A) {
                        out[l++] = t[s + A] * i + t[s + d + A] * a;
                    }
                    r += o;
                    s = Math.floor(r) * d;
                }
                // 尾部缓存
                for (let A = 0; A < d; ++A) {
                    e.lastOutput[A] = t[s++];
                }
                return e.bufferSlice(l);
            };
        }
        multiTap() {
            const e = this;
            this.resampler = t => {
                const d = e.channels,
                      R = e.ratioWeight,
                      out = e.outputBuffer;
                let w = !e.tailExists ? R : e.lastWeight,
                    read = 0,
                    write = 0,
                    acc = new Array(d).fill(0);
                e.tailExists = false;
                while (write < out.length && read < t.length) {
                    acc.fill(0);
                    let rem = w;
                    while (rem > 0 && read < t.length) {
                        const take = Math.min(rem, 1);
                        for (let ch = 0; ch < d; ch++) {
                            acc[ch] += t[read + ch] * take;
                        }
                        rem -= take;
                        if (take >= 1) read += d;
                    }
                    if (rem > 0) {
                        e.tailExists = true;
                        e.lastWeight = rem;
                        e.lastOutput = acc.slice();
                        break;
                    }
                    for (let ch = 0; ch < d; ch++) {
                        out[write++] = acc[ch] / R;
                    }
                    w = R;
                }
                return e.bufferSlice(write);
            };
        }
        resample(input) {
            if (this.fromSampleRate !== this.toSampleRate) {
                this.initializeBuffers();
                this.ratioWeight = this.fromSampleRate / this.toSampleRate;
            }
            return this.resampler(input);
        }
    }
    if (typeof window !== "undefined") window.WavResampler = WavResampler;

    // ——— 2. 语音识别 扩展 ———
	const svgIcon  = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0i5Zu+5bGCXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDAgNDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQwIDQwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPg0KCS5zdDB7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojRkZGRkZGO30NCgkuc3Qxe2ZpbGw6Izc0MzlFQTt9DQoJLnN0MntlbmFibGUtYmFja2dyb3VuZDpuZXcgICAgO30NCgkuc3Qze2ZpbGw6IzFGOTFFMTt9DQoJLnN0NHtmaWxsOm5vbmU7c3Ryb2tlOiM0RDQzRkY7c3Ryb2tlLXdpZHRoOjAuNTt9DQoJLnN0NXtmaWxsOiM0RDQzRkY7fQ0KCS5zdDZ7ZmlsbDojRkZGRkZGO30NCjwvc3R5bGU+DQo8dGl0bGU+57yW57uEIDI0PC90aXRsZT4NCjxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPg0KPGcgaWQ9Iumhtemdoi0xIj4NCgk8ZyBpZD0i5ZCI5oiQIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTMuMDAwMDAwLCAtMTMuMDAwMDAwKSI+DQoJCTxnIGlkPSLnvJbnu4QtMjQiPg0KCQkJPGcgaWQ9Iue8lue7hC00IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMy4wMDAwMDAsIDEzLjAwMDAwMCkiPg0KCQkJCTxnIGlkPSLnvJbnu4QtMiI+DQoJCQkJCTxnIGlkPSLnn6nlvaJfMV8iPg0KCQkJCQkJPHBhdGggY2xhc3M9InN0MCIgZD0iTTUuODIsNGgxNy44MmMxLDAsMS44MiwwLjgxLDEuODIsMS44MnYxNy44MmMwLDEtMC44MSwxLjgyLTEuODIsMS44Mkg1LjgyYy0xLDAtMS44Mi0wLjgxLTEuODItMS44Mg0KCQkJCQkJCVY1LjgyQzQsNC44MSw0LjgxLDQsNS44Miw0eiIvPg0KCQkJCQkJPHBhdGggY2xhc3M9InN0MSIgZD0iTTIzLjY0LDI1Ljc2SDUuODJjLTEuMTcsMC0yLjEyLTAuOTUtMi4xMi0yLjEyVjUuODJjMC0xLjE3LDAuOTUtMi4xMiwyLjEyLTIuMTJoMTcuODINCgkJCQkJCQljMS4xNywwLDIuMTIsMC45NSwyLjEyLDIuMTJ2MTcuODJDMjUuNzYsMjQuODEsMjQuODEsMjUuNzYsMjMuNjQsMjUuNzZ6IE01LjgyLDQuM0M0Ljk4LDQuMyw0LjMsNC45OCw0LjMsNS44MnYxNy44Mg0KCQkJCQkJCWMwLDAuODQsMC42OCwxLjUyLDEuNTIsMS41MmgxNy44MmMwLjg0LDAsMS41Mi0wLjY4LDEuNTItMS41MlY1LjgyYzAtMC44NC0wLjY4LTEuNTItMS41Mi0xLjUySDUuODJ6Ii8+DQoJCQkJCTwvZz4NCgkJCQkJPGcgY2xhc3M9InN0MiI+DQoJCQkJCQk8cGF0aCBjbGFzcz0ic3QzIiBkPSJNMTkuNjgsMTIuNjhoLTAuNTVjLTAuMTUtMC40My0wLjM4LTAuODktMC43MS0xLjM4Yy0wLjMyLTAuNDktMC42Mi0wLjc2LTAuOS0wLjgNCgkJCQkJCQljLTAuMTUtMC4wMi0wLjM0LTAuMDQtMC41Ni0wLjA1Yy0wLjIyLTAuMDEtMC40MS0wLjAyLTAuNTctMC4wMmgtMC4zM3Y3LjkxYzAsMC4xNywwLjAzLDAuMzIsMC4wOSwwLjQ1DQoJCQkJCQkJYzAuMDYsMC4xMywwLjE4LDAuMjMsMC4zNiwwLjMxYzAuMTEsMC4wNCwwLjI4LDAuMDksMC41MSwwLjEzYzAuMjMsMC4wNCwwLjQyLDAuMDgsMC41OSwwLjF2MC41NWgtNS42MnYtMC41NQ0KCQkJCQkJCWMwLjE0LTAuMDEsMC4zMy0wLjAzLDAuNTgtMC4wNnMwLjQyLTAuMDYsMC41MS0wLjFjMC4xOC0wLjA4LDAuMzEtMC4xOCwwLjM3LTAuMzFzMC4wOS0wLjI4LDAuMDktMC40NXYtNy45OEgxMy4yDQoJCQkJCQkJYy0wLjE2LDAtMC4zNSwwLjAxLTAuNTcsMC4wMmMtMC4yMiwwLjAxLTAuNDEsMC4wMy0wLjU2LDAuMDVjLTAuMjcsMC4wNC0wLjU3LDAuMy0wLjksMC44Yy0wLjMyLDAuNDktMC41NiwwLjk1LTAuNzEsMS4zOA0KCQkJCQkJCUg5LjkxVjkuOGg5Ljc3VjEyLjY4eiIvPg0KCQkJCQk8L2c+DQoJCQkJCTxnIGNsYXNzPSJzdDIiPg0KCQkJCQkJPHBhdGggY2xhc3M9InN0NCIgZD0iTTE5LjY4LDEyLjY4aC0wLjU1Yy0wLjE1LTAuNDMtMC4zOC0wLjg5LTAuNzEtMS4zOGMtMC4zMi0wLjQ5LTAuNjItMC43Ni0wLjktMC44DQoJCQkJCQkJYy0wLjE1LTAuMDItMC4zNC0wLjA0LTAuNTYtMC4wNWMtMC4yMi0wLjAxLTAuNDEtMC4wMi0wLjU3LTAuMDJoLTAuMzN2Ny45MWMwLDAuMTcsMC4wMywwLjMyLDAuMDksMC40NQ0KCQkJCQkJCWMwLjA2LDAuMTMsMC4xOCwwLjIzLDAuMzYsMC4zMWMwLjExLDAuMDQsMC4yOCwwLjA5LDAuNTEsMC4xM2MwLjIzLDAuMDQsMC40MiwwLjA4LDAuNTksMC4xdjAuNTVoLTUuNjJ2LTAuNTUNCgkJCQkJCQljMC4xNC0wLjAxLDAuMzMtMC4wMywwLjU4LTAuMDZzMC40Mi0wLjA2LDAuNTEtMC4xYzAuMTgtMC4wOCwwLjMxLTAuMTgsMC4zNy0wLjMxczAuMDktMC4yOCwwLjA5LTAuNDV2LTcuOThIMTMuMg0KCQkJCQkJCWMtMC4xNiwwLTAuMzUsMC4wMS0wLjU3LDAuMDJjLTAuMjIsMC4wMS0wLjQxLDAuMDMtMC41NiwwLjA1Yy0wLjI3LDAuMDQtMC41NywwLjMtMC45LDAuOGMtMC4zMiwwLjQ5LTAuNTYsMC45NS0wLjcxLDEuMzgNCgkJCQkJCQlIOS45MVY5LjhoOS43N1YxMi42OHoiLz4NCgkJCQkJPC9nPg0KCQkJCTwvZz4NCgkJCQk8ZyBpZD0i57yW57uELTMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE3LjQwMDAwMCwgMTcuNDAwMDAwKSI+DQoJCQkJCTxnIGlkPSLnn6nlvaJfMl8iPg0KCQkJCQkJPHBhdGggY2xhc3M9InN0MCIgZD0iTS0xLjA0LTIuODVoMTcuODJjMSwwLDEuODIsMC44MSwxLjgyLDEuODJ2MTcuODJjMCwxLTAuODEsMS44Mi0xLjgyLDEuODJILTEuMDQNCgkJCQkJCQljLTEsMC0xLjgyLTAuODEtMS44Mi0xLjgyVi0xLjA0Qy0yLjg1LTIuMDQtMi4wNC0yLjg1LTEuMDQtMi44NXoiLz4NCgkJCQkJCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNi43OCwxOC45MUgtMS4wNGMtMS4xNywwLTIuMTItMC45NS0yLjEyLTIuMTJWLTEuMDRjMC4wMS0xLjE3LDAuOTYtMi4xMSwyLjEyLTIuMTFoMTcuODINCgkJCQkJCQljMS4xNywwLDIuMTIsMC45NSwyLjEyLDIuMTJ2MTcuODJDMTguOSwxNy45NiwxNy45NSwxOC45MSwxNi43OCwxOC45MXogTS0xLjA0LTIuNTVjLTAuODMsMC0xLjUxLDAuNjgtMS41MiwxLjUxdjE3LjgzDQoJCQkJCQkJYzAsMC44NCwwLjY4LDEuNTIsMS41MiwxLjUyaDE3LjgyYzAuODQsMCwxLjUyLTAuNjgsMS41Mi0xLjUyVi0xLjAzYzAtMC44NC0wLjY4LTEuNTItMS41Mi0xLjUySC0xLjA0eiIvPg0KCQkJCQk8L2c+DQoJCQkJCTxnIGlkPSLnvJbnu4QiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDExLjQwMDAwMCwgOC40MDAwMDApIj4NCgkJCQkJCTxnIGlkPSLot6/lvoQiPg0KCQkJCQkJCTxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0tMy40NCwxLjg0YzEuMjYsMCwyLjI3LTEsMi4yNy0yLjI0di0zLjcxYzAtMS4yNC0xLjAyLTIuMjQtMi4yNy0yLjI0cy0yLjI3LDEtMi4yNywyLjI0djMuNzENCgkJCQkJCQkJQy01LjY4LDAuODQtNC42OSwxLjg0LTMuNDQsMS44NHoiLz4NCgkJCQkJCQk8cGF0aCBjbGFzcz0ic3Q1IiBkPSJNLTMuNDQsMi4wOWMtMS4zOCwwLTIuNDktMS4wOS0yLjUyLTIuNDh2LTMuNzJjMC0xLjM3LDEuMTMtMi40OSwyLjUyLTIuNDlzMi41MiwxLjEyLDIuNTIsMi40OXYzLjcxDQoJCQkJCQkJCUMtMC45MiwwLjk3LTIuMDUsMi4wOS0zLjQ0LDIuMDl6IE0tMy40NC02LjFjLTEuMTEsMC0yLjAyLDAuODktMi4wMiwxLjk5djMuNzFjMC4wMywxLjExLDAuOTIsMS45OSwyLjAyLDEuOTkNCgkJCQkJCQkJYzEuMTEsMCwyLjAyLTAuODksMi4wMi0xLjk5di0zLjcxQy0xLjQyLTUuMjEtMi4zMy02LjEtMy40NC02LjF6Ii8+DQoJCQkJCQk8L2c+DQoJCQkJCQk8ZyBpZD0i6Lev5b6EXzFfIj4NCgkJCQkJCQk8cGF0aCBjbGFzcz0ic3QzIiBkPSJNMC4wMi0xLjg3Yy0wLjI0LDAtMC40NSwwLjItMC40NSwwLjQzdjEuMTdjMCwxLjYzLTEuMzgsMi45NS0zLjEsMi45NXMtMy4xLTEuMzItMy4xLTIuOTV2LTEuMjkNCgkJCQkJCQkJYzAtMC4yMy0wLjIxLTAuNDMtMC40NS0wLjQzcy0wLjQ1LDAuMi0wLjQ1LDAuNDN2MS4yOWMwLDEuOTUsMS41NiwzLjU4LDMuNTUsMy43OHYwLjkyaC0xLjVjLTAuMjQsMC0wLjQ1LDAuMi0wLjQ1LDAuNDMNCgkJCQkJCQkJczAuMjEsMC40MywwLjQ1LDAuNDNoMy45MWMwLjI0LDAsMC40NS0wLjIsMC40NS0wLjQzcy0wLjIxLTAuNDMtMC40NS0wLjQzaC0xLjVWMy41MmMxLjk5LTAuMiwzLjU1LTEuODMsMy41NS0zLjc4di0xLjE3DQoJCQkJCQkJCUMwLjQ3LTEuNywwLjI2LTEuODcsMC4wMi0xLjg3eiIvPg0KCQkJCQkJCTxwYXRoIGNsYXNzPSJzdDUiIGQ9Ik0tMS41Nyw1LjU0aC0zLjkxYy0wLjM4LDAtMC43LTAuMzEtMC43LTAuNjhzMC4zMi0wLjY4LDAuNy0wLjY4aDEuMjVWMy43M2MtMi4wMS0wLjMxLTMuNTUtMi4wMy0zLjU1LTQNCgkJCQkJCQkJdi0xLjI5YzAtMC4zNywwLjMyLTAuNjgsMC43LTAuNjhzMC43LDAuMzEsMC43LDAuNjh2MS4yOWMwLDEuNDksMS4yOCwyLjcsMi44NSwyLjdjMS41NywwLDIuODUtMS4yMSwyLjg1LTIuN3YtMS4xNw0KCQkJCQkJCQljMC0wLjM3LDAuMzItMC42OCwwLjctMC42OGMwLjM5LDAsMC42OSwwLjI5LDAuNzEsMC42OHYxLjE4YzAsMS45Ny0xLjU0LDMuNjktMy41NSw0djAuNDRoMS4yNWMwLjM4LDAsMC43LDAuMzEsMC43LDAuNjgNCgkJCQkJCQkJUy0xLjE5LDUuNTQtMS41Nyw1LjU0eiBNLTUuNDgsNC42OGMtMC4xLDAtMC4yLDAuMDktMC4yLDAuMThjMCwwLjA5LDAuMSwwLjE4LDAuMiwwLjE4aDMuOTFjMC4xLDAsMC4yLTAuMDksMC4yLTAuMTgNCgkJCQkJCQkJYzAtMC4wOS0wLjEtMC4xOC0wLjItMC4xOGgtMS43NVYzLjI5bDAuMjItMC4wMmMxLjg3LTAuMTksMy4zMy0xLjc0LDMuMzMtMy41M3YtMS4xN0MwLjIyLTEuNjktMC4xOC0xLjYyLTAuMTgtMS40NHYxLjE3DQoJCQkJCQkJCWMwLDEuNzYtMS41LDMuMi0zLjM1LDMuMmMtMS44NSwwLTMuMzUtMS40NC0zLjM1LTMuMnYtMS4yOWMwLTAuMDktMC4xLTAuMTgtMC4yLTAuMThjLTAuMSwwLTAuMiwwLjA5LTAuMiwwLjE4djEuMjkNCgkJCQkJCQkJYzAsMS43OSwxLjQ2LDMuMzQsMy4zMywzLjUzbDAuMjMsMC4wMnYxLjRILTUuNDh6Ii8+DQoJCQkJCQk8L2c+DQoJCQkJCTwvZz4NCgkJCQk8L2c+DQoJCQkJDQoJCQkJCTxnIGlkPSLnvJbnu4RfMV8iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ0Ljk4MzQ5NCwgOC4yMDE3OTUpIHNjYWxlKC0xLCAxKSByb3RhdGUoLTYwLjAwMDAwMCkgdHJhbnNsYXRlKC00NC45ODM0OTQsIC04LjIwMTc5NSkgdHJhbnNsYXRlKDM4LjQ4MzQ5NCwgNC4yMDE3OTUpIj4NCgkJCQkJPGcgaWQ9Iui3r+W+hF8yXyI+DQoJCQkJCQk8cGF0aCBjbGFzcz0ic3Q2IiBkPSJNMTIuMDQsMTUuMTh2LTEuMTdMOS4xNSwxNS44Yy0wLjE5LDAuMTItMC4xOSwwLjMyLDAsMC40NGwyLjg4LDEuNzlsMC0xLjE3YzEuNjMsMCwzLjE0LDAuMjUsNC40MywxLjUxDQoJCQkJCQkJQzE1Ljg4LDE2LjAyLDEzLjQ0LDE1LjE4LDEyLjA0LDE1LjE4Ii8+DQoJCQkJCQk8cGF0aCBjbGFzcz0ic3QxIiBkPSJNOC43OCwxNi4yOGMwLjA1LDAuMDgsMC4xMiwwLjE2LDAuMjEsMC4yMWwzLjM0LDIuMDhsMC0xLjQxYzEuMzQsMC4wMywyLjczLDAuMjYsMy45MiwxLjQyTDE3LDE5LjMyDQoJCQkJCQkJbC0wLjI1LTEuMDJjLTAuNTctMi4zNS0yLjg1LTMuMy00LjQxLTMuNDFsMC0xLjQybC0zLjM1LDIuMDdjLTAuMTgsMC4xMi0wLjI4LDAuMjktMC4yOCwwLjQ4DQoJCQkJCQkJQzguNzEsMTYuMTEsOC43MywxNi4yLDguNzgsMTYuMjh6IE0xMS43MywxNy40OWwtMi4zNi0xLjQ3bDIuMzctMS40N2wwLDAuOTNsMC4zLDBjMS4wOCwwLDIuODIsMC41NSwzLjcsMS45NQ0KCQkJCQkJCWMtMS4yMS0wLjc1LTIuNTMtMC44Ny0zLjcxLTAuODdsLTAuMywwTDExLjczLDE3LjQ5eiIvPg0KCQkJCQk8L2c+DQoJCQkJPC9nPg0KCQkJPC9nPg0KCQk8L2c+DQoJPC9nPg0KPC9nPg0KPC9zdmc+DQo=";

    // ——— 语音识别扩展 ———
    class CxSpeech2Text {
        constructor(runtime) {
            this.runtime = runtime;
            this._context = null;
            this._resampler = null;
            this._micStream = null;
            this.bufferArray = [];
            this.result = "";
            this._onSpeechDone = null;
            this._onSpeechFail = null;

            this.initMicroPhone = this.initMicroPhone.bind(this);
            this._resetListening  = this._resetListening.bind(this);
            this.initMicroPhone();
        }
        async initMicroPhone() {
            if (!this._context) {
                this._context = new (window.AudioContext||window.webkitAudioContext)();
                this._resampler = new WavResampler(this._context.sampleRate, 16000, 1, 8192);

                // 动态注册 worklet
                const code = `
                    class RecorderProcessor extends AudioWorkletProcessor {
                        process(inputs) {
                            const input = inputs[0][0];
                            if (input) this.port.postMessage(input);
                            return true;
                        }
                    }
                    registerProcessor('recorder-processor', RecorderProcessor);
                `;
                const blob = new Blob([code], { type: "application/javascript" });
                await this._context.audioWorklet.addModule(URL.createObjectURL(blob));
            }
            // 获取麦克风流
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(s => this._micStream = s)
                .catch(e => console.error("Mic error:", e));
        }

        getInfo() {
            return {
                id: "cxspeech2text",
                name: "语音识别",
				color1: '#508050', // 主色（浅绿色）
				color2: '#008000', // 次色（稍深的浅绿）
                menuIconURI: svgIcon,
				blockIconURI: svgIcon,
                blocks: [
                    { opcode: "startListen", blockType: Scratch.BlockType.COMMAND, text: "开始识别 [TIMEOUT] 秒", arguments: { TIMEOUT:{type:Scratch.ArgumentType.NUMBER, defaultValue:5} } },
                    { opcode: "stopListen",  blockType: Scratch.BlockType.COMMAND, text: "停止识别" },
                    { opcode: "getResult",   blockType: Scratch.BlockType.REPORTER, text: "识别结果" },
                    { opcode: "clear",       blockType: Scratch.BlockType.COMMAND, text: "清空结果" },
                    { opcode: "whenHeard",   blockType: Scratch.BlockType.HAT, text: "当听到 [TEXT]", arguments:{TEXT:{type:Scratch.ArgumentType.STRING, defaultValue:"你好"}} },
					{ opcode: "arrayBufferToBase64", blockType: Scratch.BlockType.REPORTER, text: "语音Base64" },
					{ opcode: "blobToBase64",   blockType: Scratch.BlockType.REPORTER, text: "语音Base64(2)" }
                ]
            };
        }
		
		startListen({ TIMEOUT }) {
			const t = Math.max(1, Math.min(60, TIMEOUT));
			this.runtime.emitMicListening(true);
			this.bufferArray = [];

			// 创建音频管道… (WorkletNode 部分不变)
			const srcNode = this._context.createMediaStreamSource(this._micStream);
			const worklet = new AudioWorkletNode(this._context, 'recorder-processor');
			worklet.port.onmessage = e => {
				const chunk = this._resampler.resample(e.data);
				this.bufferArray.push(...chunk);
			};
			srcNode.connect(worklet).connect(this._context.destination);

			// 保存断开方法
			this._cleanupAudio = () => {
				srcNode.disconnect();
				worklet.disconnect();
				this.runtime.emitMicListening(false);
			};

			// 保存 Promise resolve / reject
			return new Promise((res, rej) => {
				this._onSpeechDone = () => {
					this._cleanupAudio();
					res();
				};
				this._onSpeechFail = err => {
					this._cleanupAudio();
					rej(err);
				};
				// **保存超时 ID**
				this._timeoutId = setTimeout(() => {
					this._recognize();
				}, t * 1000);
			});
		}

		stopListen() {
			// 如果还在等待超时，就先清掉它
			if (this._timeoutId != null) {
				clearTimeout(this._timeoutId);
				this._timeoutId = null;
				// 立即识别并结束
				this._recognize();
			}
		}

		_recognize() {
			// 确保不会重复调用
			if (this._timeoutId != null) {
				clearTimeout(this._timeoutId);
				this._timeoutId = null;
			}
			// 清掉音频流
			this._cleanupAudio && this._cleanupAudio();

			// 构造 WAV 并上传… (和之前的代码一致)
			const buf = new ArrayBuffer(this.bufferArray.length * 2);
			this.arrBuffer = buf;
			const dv = new DataView(buf);
			let off = 0;
			for (let v of this.bufferArray) {
				const s = Math.max(-1, Math.min(1, v));
				dv.setInt16(off, s < 0 ? 32768 * s : 32767 * s, true);
				off += 2;
			}
			const blob = new Blob([dv], { type: "audio/wav" });
			this.wavBlob = blob;
			const form = new FormData();
			form.set("file", blob);
			fetch("https://ai.eliteu.cn/speech/server_api", { method: "POST", body: form })
				.then(r => r.json())
				.then(j => {
					if (j.err_no === 0) {
						//this.result = j.result[0];
						this.result += j.result[0];
						this._onSpeechDone();
					} else {
						this._onSpeechFail && this._onSpeechFail(j.err_msg);
					}
				})
				.catch(err => this._onSpeechFail && this._onSpeechFail(err));
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

        _resetListening() {
            this.runtime.emitMicListening(false);
        }
		
		arrayBufferToBase64() {
			if (!this.arrBuffer) return "";
			let str = "", bytes = new Uint8Array(this.arrBuffer);
			for (let b of bytes) str += String.fromCharCode(b);
			return "data:audio/wav;base64," + window.btoa(str);
		}
		
		blobToBase64() {
			if (!this.wavBlob) return Promise.resolve("");
			return new Promise(resolve => {
				const reader = new FileReader();
				reader.onload = () => {
					  resolve(reader.result);  // e.g. "data:audio/wav;base64,...."
					};
				reader.readAsDataURL(this.wavBlob);
				});
		}
    }

    Scratch.extensions.register(new CxSpeech2Text(Scratch.vm.runtime));
})(Scratch);
