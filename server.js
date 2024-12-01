const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-transcribe-streaming");

// Expressアプリの初期化
const expressApp = express();
const httpServer = http.createServer(expressApp);
const wsServer = new Server(httpServer);

const getAppPath = () => {
    return process.pkg ? path.dirname(process.execPath) : __dirname;
};

// 静的ファイルの設定
expressApp.use(express.static(getAppPath()));

// ルーティング設定
expressApp.get('/', (_, res) => res.sendFile(path.join(getAppPath(), 'index.html')));

// AWS認証情報()
const AWS_CONFIG = {
    region: "your region",
    credentials: {
        accessKeyId: "your key", 
        secretAccessKey: "your key"
    }
};

// 音声認識クライアントの初期化
const transcriber = new TranscribeStreamingClient(AWS_CONFIG);

class TranscriptionManager {
    constructor(socket) {
        this.socket = socket;
        this.audioStream = null;
        this.prevTranscript = '';
        this.isActive = false;
        this.audioBuffer = Buffer.from('');
        
        this.initializeEventHandlers();
    }

    initializeEventHandlers() {
        this.socket.on('startTranscription', () => this.startTranscription());
        this.socket.on('audioData', data => this.handleAudioData(data));
        this.socket.on('stopTranscription', () => this.stopTranscription());
        this.socket.on('disconnect', () => this.cleanup());
        // 他のsocket機能 TODO
    }

    async *createAudioStream() {
        while (this.isActive) {
            const chunk = await new Promise(resolve => this.socket.once('audioData', resolve));
            if (!chunk) break;
            
            this.audioBuffer = Buffer.concat([this.audioBuffer, Buffer.from(chunk)]);
            console.log('音声データを受信しました。バッファサイズ:', this.audioBuffer.length);

            while (this.audioBuffer.length >= 1024) {
                yield { AudioEvent: { AudioChunk: this.audioBuffer.slice(0, 1024) } };
                this.audioBuffer = this.audioBuffer.slice(1024);
            }
        }
    }

    async startTranscription() {
        console.log('音声認識を開始します');
        this.isActive = true;

        const transcriptionConfig = {
            LanguageCode: "ja-JP",
            MediaSampleRateHertz: 44100,
            MediaEncoding: "pcm",
            AudioStream: this.createAudioStream()
        };

        try {
            console.log('AWSへリクエストを送信中...');
            const response = await transcriber.send(new StartStreamTranscriptionCommand(transcriptionConfig));
            console.log('AWSからレスポンスを受信しました');

            await this.processTranscriptionStream(response);
        } catch (err) {
            console.error("音声認識エラー:", err);
            this.socket.emit('error', `音声認識処理でエラーが発生しました: ${err.message}`);
        }
    }

    async processTranscriptionStream(response) {
        for await (const event of response.TranscriptResultStream) {
            if (!this.isActive) break;
            
            const transcriptEvent = event.TranscriptEvent;
            if (!transcriptEvent) continue;

            console.log('認識結果を受信:', JSON.stringify(transcriptEvent));
            
            const results = transcriptEvent.Transcript.Results;
            if (!results?.[0]?.Alternatives?.[0]) continue;

            const transcript = results[0].Alternatives[0].Transcript;
            const isPartial = results[0].IsPartial;
            
            if (!transcript) continue;

            if (!isPartial) {
                console.log('確定した認識結果:', transcript);
                this.socket.emit('transcription', { text: transcript, isFinal: true });
                this.prevTranscript = transcript;
            } else {
                const newContent = transcript.substring(this.prevTranscript.length || 0).trim();
                if (newContent) {
                    console.log('暫定認識結果:', newContent);
                    this.socket.emit('transcription', { text: newContent, isFinal: false });
                }
            }
        }
    }

    handleAudioData(data) {
        if (this.isActive) {
            console.log('音声データを受信。サイズ:', data.byteLength);
            this.socket.emit('audioData', data);
        }
    }

    stopTranscription() {
        console.log('音声認識を停止します');
        this.cleanup();
    }

    cleanup() {
        this.isActive = false;
        this.audioStream = null;
        this.prevTranscript = '';
        this.audioBuffer = Buffer.from('');
    }
}

// WebSocket接続の処理
wsServer.on('connection', socket => {
    console.log('ユーザーが接続しました');
    new TranscriptionManager(socket);
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});