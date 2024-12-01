// 必要なモジュールのインポート
const fs = require('fs');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-transcribe-streaming");

// AWS Transcribeクライアントの初期化
const transcribeClient = new TranscribeStreamingClient({
    region: "your_region",
    credentials: {
        accessKeyId: "your_access_key_id",
        secretAccessKey: "your_secret_access_key"
    }
});

// 音声ファイルを文字起こしする関数
async function transcribeAudioFile(filePath) {
    // 音声ファイルの読み込み
    const audioFile = fs.readFileSync(filePath);
    let position = 0;
    
    // 音声ストリームジェネレーターの作成
    const audioStream = async function* () {
        while (position < audioFile.length) {
            const chunk = audioFile.slice(position, position + 1024);
            position += 1024;
            yield { AudioEvent: { AudioChunk: chunk } };
        }
    };

    // 文字起こしコマンドの設定
    const command = new StartStreamTranscriptionCommand({
        LanguageCode: "ja-JP",          // 日本語を指定
        MediaSampleRateHertz: 44100,    // サンプリングレート
        MediaEncoding: "pcm",           // 音声エンコーディング形式
        AudioStream: audioStream()       // 音声ストリーム
    });

    try {
        console.log('文字起こしを開始します...');
        const response = await transcribeClient.send(command);
        
        // 文字起こし結果のストリーム処理
        for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent) {
                const results = event.TranscriptEvent.Transcript.Results;
                if (results.length > 0 && results[0].Alternatives.length > 0) {
                    const transcript = results[0].Alternatives[0].Transcript;
                    const isFinal = !results[0].IsPartial;

                    if (isFinal) {
                      console.log('最終結果:', transcript);
                      console.log('正解テキスト:音声認識の現状について教えていただけないでしょうか。はい。最近では音声認識でもディープラーニングがよく使われてますね。それはどういったものなのでしょうか。簡単に言えば脳の仕組みをモデルにした技術です。それは難しそうですね。一部では人間の能力を超えるまでになっています。')
                    } else {
                        console.log('中間結果:', transcript);
                    }
                }
            }
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
}

// テストの実行
const audioFilePath = './ja-JP_Broadband-sample.raw';
transcribeAudioFile(audioFilePath)
    .then(() => console.log('文字起こしが完了しました'))
    .catch(err => console.error('テストが失敗しました:', err));
