export interface Sentence {
  id: number;
  text: string;
  translation: string;
  audioDurationSec: number;
  pronunciationTips: string;
  blanks: number[]; // 0-indexed indices of words to be blanked
}

export interface DictationMaterial {
  title: string;
  artist: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  sentences: Sentence[];
}

export const curatedSongs: DictationMaterial[] = [
  {
    title: "Yesterday",
    artist: "The Beatles",
    difficulty: "Beginner",
    description: "经典英文金曲，语速适中，连读较少，非常适合初学者进行听写练习。注意 'troubles' 和 'yesterday' 的发音和拼写。",
    sentences: [
      {
        id: 1,
        text: "Yesterday, all my troubles seemed so far away.",
        translation: "昨天，我所有的烦恼似乎都已远去。",
        audioDurationSec: 4.5,
        pronunciationTips: "'troubles' 的 /b/ 音发音短促；'far away' 存在连读：/fɑːr/ 结尾的卷舌音和 /əˈweɪ/ 连读为 'far-away'。",
        blanks: [3, 4, 7] // troubles, seemed, away
      },
      {
        id: 2,
        text: "Now it looks as though they're here to stay.",
        translation: "而现在，它们似乎要停留在此了。",
        audioDurationSec: 4.2,
        pronunciationTips: "'looks as' 发生连读 /lʊks/ 结尾的 /s/ 与 /æz/ 连读为 'looks-as'；'they're' 弱读为 /ðə/。",
        blanks: [2, 4, 8] // looks, though, stay
      },
      {
        id: 3,
        text: "Oh, I believe in yesterday.",
        translation: "噢，我相信昨天。",
        audioDurationSec: 3.8,
        pronunciationTips: "'believe in' 连读：/bɪˈliːv/ 的 /v/ 与 /ɪn/ 连读为 'believe-in'。",
        blanks: [2, 4] // believe, yesterday
      },
      {
        id: 4,
        text: "Suddenly, I'm not half the man I used to be.",
        translation: "突然间，我感觉自己已不复当年之勇。",
        audioDurationSec: 4.6,
        pronunciationTips: "'used to' 发生同化发音：'used' 的 /d/ 与 'to' 的 /t/ 同化，发成单音 /juːstə/，d不发音。",
        blanks: [0, 4, 8] // Suddenly, half, used
      },
      {
        id: 5,
        text: "There's a shadow hanging over me.",
        translation: "有一缕阴影笼罩在我的上方。",
        audioDurationSec: 4.0,
        pronunciationTips: "'hanging over' 连读：/ˈhæŋɪŋ/ 的鼻音 /ŋ/ 与 /ˈəʊvə/ 连读为 'hanging-over'。",
        blanks: [2, 3, 4] // shadow, hanging, over
      },
      {
        id: 6,
        text: "Oh, yesterday came suddenly.",
        translation: "噢，昨天来得太突然。",
        audioDurationSec: 3.5,
        pronunciationTips: "'came suddenly' 中 'came' 的鼻音 /m/ 在过渡到 'suddenly' 的 /s/ 时要保持流畅连贯。",
        blanks: [2, 3] // came, suddenly
      },
      {
        id: 7,
        text: "Why she had to go, I don't know, she wouldn't say.",
        translation: "为什么她一定要走？我不知道，她不肯说。",
        audioDurationSec: 5.5,
        pronunciationTips: "'don't know' 中的 /t/ 音完全失去爆破，只作停顿；'had to' 发音为 'had-to'，/d/ 音弱化。",
        blanks: [3, 9, 10] // had, wouldn't, say
      },
      {
        id: 8,
        text: "I said something wrong, now I long for yesterday.",
        translation: "我一定是说错了什么，现在我极度渴望昨天。",
        audioDurationSec: 4.8,
        pronunciationTips: "'long for' 弱读：'for' 弱读为 /fə/；'said something' 的 /d/ 音爆破弱化，迅速滑向 'something'。",
        blanks: [2, 3, 6] // something, wrong, long
      }
    ]
  },
  {
    title: "Amazing Grace",
    artist: "Traditional Hymn",
    difficulty: "Beginner",
    description: "最著名的英文圣歌，旋律优美，发音极为饱满清晰。非常适合练习基础单词的听写和元音发音。",
    sentences: [
      {
        id: 1,
        text: "Amazing grace, how sweet the sound",
        translation: "奇异恩典，何等甘甜的声音",
        audioDurationSec: 4.2,
        pronunciationTips: "'Amazing' 的首音 /ə/ 弱读；'sweet the' 发生不完全爆破，/t/ 只保留阻碍，不爆破，直接过渡到 /ð/。",
        blanks: [0, 1, 3] // Amazing, grace, sweet
      },
      {
        id: 2,
        text: "That saved a wretch like me!",
        translation: "它挽救了我这个可怜的人！",
        audioDurationSec: 3.9,
        pronunciationTips: "'saved a' 连读：/seɪvd/ 结尾的 /d/ 与 /ə/ 连读为 'saved-a'；'like me' 的 /k/ 失去爆破。",
        blanks: [1, 3, 4] // saved, wretch, like
      },
      {
        id: 3,
        text: "I once was lost, but now am found",
        translation: "我曾一度迷失，如今已被找回",
        audioDurationSec: 4.5,
        pronunciationTips: "'was lost' 的 /s/ 弱化；'but now' 中 'but' 的 /t/ 失去爆破，舌尖抵住齿龈，不送气，直接发 'now'。",
        blanks: [1, 3, 7] // once, lost, found
      },
      {
        id: 4,
        text: "Was blind, but now I see.",
        translation: "昔日盲目，今日终得看见。",
        audioDurationSec: 3.8,
        pronunciationTips: "'blind but' 连读：/blaɪnd/ 结尾的 /d/ 失去爆破；'now I' 连读：/naʊ/ 的双元音过渡到 /aɪ/ 伴随微弱的 /w/ 滑音。",
        blanks: [1, 5] // blind, see
      }
    ]
  },
  {
    title: "A Thousand Years",
    artist: "Christina Perri",
    difficulty: "Intermediate",
    description: "《暮光之城》主题曲。感情丰富，语速抒情而流畅。含有大量中等难度的口语连读和辅音连缀。",
    sentences: [
      {
        id: 1,
        text: "Heart beats fast, colors and promises",
        translation: "心跳正在加速，五彩斑斓的承诺",
        audioDurationSec: 4.8,
        pronunciationTips: "'colors and' 连读：/ˈkʌləz/ 的 /z/ 与 'and' 的 /ænd/ 连读，且 'and' 常常弱读为 /ən/ 形成 'colors-an'。",
        blanks: [1, 3, 5] // beats, colors, promises
      },
      {
        id: 2,
        text: "How to be brave, how can I love when I'm afraid to fall?",
        translation: "如何变得勇敢？当害怕坠落时，我该如何去爱？",
        audioDurationSec: 5.6,
        pronunciationTips: "'can I' 连读为 'can-I' /kæn-aɪ/；'afraid to' 发音时 'afraid' 的 /d/ 音不爆破，直接过渡到 'to' 的 /t/ 形成同化。",
        blanks: [3, 9, 11] // brave, afraid, fall
      },
      {
        id: 3,
        text: "But watching you stand alone, all of my doubt suddenly goes away somehow.",
        translation: "但看着你独自站立，我所有的疑虑突然间莫名消散了。",
        audioDurationSec: 6.5,
        pronunciationTips: "'watching you' 的 /g/ 变为辅音同化，/tʃ/ 结合 /j/；'stand alone' 连读为 'stand-alone' /stænd-əˈləʊn/；'all of' 连读 'all-of'。",
        blanks: [1, 7, 8, 11] // watching, doubt, suddenly, somehow
      },
      {
        id: 4,
        text: "One step closer",
        translation: "更近一步",
        audioDurationSec: 2.8,
        pronunciationTips: "'step closer' 中的 /p/ 失去爆破，只作闭合，然后迅速发出 'closer' 的 /k/ 音。",
        blanks: [1, 2] // step, closer
      },
      {
        id: 5,
        text: "I have died everyday waiting for you",
        translation: "我每日都在死去，只为等待着你",
        audioDurationSec: 4.5,
        pronunciationTips: "'died everyday' 连读 /daɪd/ 的 /d/ 音连上 /ˈevrideɪ/ 成为 'died-everyday'；'waiting for' 中 'waiting' 的 /t/ 在美音中闪音化发为 /d/ 音。",
        blanks: [2, 3, 4] // died, everyday, waiting
      },
      {
        id: 6,
        text: "Darling, don't be afraid, I have loved you for a thousand years",
        translation: "亲爱的，不要害怕，我已经爱了你一千年",
        audioDurationSec: 5.8,
        pronunciationTips: "'don't be' 失去爆破；'loved you' 弱读并连读为 'loved-you'，/d/ 音爆破变弱；'for a' 连读为 /fər-ə/。",
        blanks: [0, 6, 9] // Darling, loved, thousand
      },
      {
        id: 7,
        text: "I'll love you for a thousand more.",
        translation: "我还会再爱你一千年。",
        audioDurationSec: 4.2,
        pronunciationTips: "'I'll' 弱读为 /aɪl/；'love you' 丝滑连读为 /lʌv-ju/；'thousand more' 中 'thousand' 的 /d/ 失去爆破，直接发 /m/ 音。",
        blanks: [2, 5, 6] // love, thousand, more
      }
    ]
  },
  {
    title: "Counting Stars",
    artist: "OneRepublic",
    difficulty: "Advanced",
    description: "节奏感极强且语速极快的流行歌曲。非常考验连读、弱读以及强节奏下的快速单词捕捉能力。",
    sentences: [
      {
        id: 1,
        text: "Lately, I've been, I've been losing sleep",
        translation: "最近，我常常辗转反侧、难以入眠",
        audioDurationSec: 4.2,
        pronunciationTips: "'I've been' 高速弱读，'I've' 听起来像 /aɪ/，'been' 音极短；'losing sleep' 的 /ŋ/ 到 /sl/ 连缀发音需要干净利落。",
        blanks: [0, 5, 6] // Lately, losing, sleep
      },
      {
        id: 2,
        text: "Dreaming about the things that we could be",
        translation: "幻想着我们本可以达到的未来",
        audioDurationSec: 3.8,
        pronunciationTips: "'Dreaming about' 连读：/ˈdriːmɪŋ/ 结尾的鼻音 /ŋ/ 与 'about' /əˈbaʊt/ 连读；'that we' 的 /t/ 失去爆破。",
        blanks: [0, 3, 6] // Dreaming, things, could
      },
      {
        id: 3,
        text: "But baby, I've been, I've been praying hard",
        translation: "但是宝贝，我一直在虔诚祈祷",
        audioDurationSec: 4.0,
        pronunciationTips: "'But baby' 中 'But' 的 /t/ 失去爆破；'praying hard' 的 /h/ 弱读，甚至被前面的浊音略微同化。",
        blanks: [1, 5, 6] // baby, praying, hard
      },
      {
        id: 4,
        text: "Said, no more counting dollars, we'll be counting stars.",
        translation: "我说，别再去数钞票了，我们将一起数繁星。",
        audioDurationSec: 4.9,
        pronunciationTips: "'counting' 弱化：/t/ 常被省略，听起来像 'coun-ing' /kaʊnɪŋ/；'we'll be' 快速滑过，'dollars' 的复数 /z/ 要读出。",
        blanks: [3, 4, 8] // counting, dollars, stars
      }
    ]
  },
  {
    title: "IELTS Tourism in Australia",
    artist: "Academic Listening Course",
    difficulty: "Advanced",
    description: "雅思听力 Section 2 经典学术/讲座风格独白。词汇更具学术性，句式工整，语调标准。适合强化学术英语听写能力。",
    sentences: [
      {
        id: 1,
        text: "Good morning everyone, and welcome to our tourist information session.",
        translation: "大家早上好，欢迎来到我们的旅游信息宣讲会。",
        audioDurationSec: 5.2,
        pronunciationTips: "'and welcome' 中 'and' 弱读为 /ən/；'tourist information' 的 /t/ 与 /ɪ/ 连读为 /tʊərɪst-ɪnfəˈmeɪʃən/ 辅元连读。",
        blanks: [4, 6, 8] // welcome, tourist, session
      },
      {
        id: 2,
        text: "Today, we will focus on the unique wildlife of Australia.",
        translation: "今天，我们将重点介绍澳大利亚独特的野生动物。",
        audioDurationSec: 4.8,
        pronunciationTips: "'focus on' 极强的连读：/ˈfəʊkəs/ 的 /s/ 与 /ɒn/ 连读为 'focus-on'；'unique' 结尾发轻音 /k/，直接过渡到 /w/ 辅音群。",
        blanks: [4, 6, 7] // focus, unique, wildlife
      },
      {
        id: 3,
        text: "Many visitors are surprised to learn that kangaroos can travel at high speeds.",
        translation: "许多游客惊讶地发现，袋鼠能够以极高速度奔跑。",
        audioDurationSec: 5.8,
        pronunciationTips: "'surprised to' 的 /d/ 和 /t/ 合并为单音 /t/；'travel at' 连读：/ˈtrævl/ 的 /l/ 与 /æt/ 连读为 'travel-at'；'high speeds' 的 /h/ 需吐气清晰。",
        blanks: [3, 7, 10] // surprised, travel, speeds
      },
      {
        id: 4,
        text: "If you are planning an excursion, make sure to bring sufficient water.",
        translation: "如果您计划远足，请务必带够充足的水。",
        audioDurationSec: 5.0,
        pronunciationTips: "'planning an' 连读为 'planning-an'；'excursion' 发音为 /ɪkˈskɜːʃn/；'sufficient' 难词拼写，重音在第二音节。",
        blanks: [4, 5, 9] // planning, excursion, sufficient
      },
      {
        id: 5,
        text: "Our local guides are highly knowledgeable and will ensure your safety.",
        translation: "我们的当地导游知识非常渊博，能够保障您的安全。",
        audioDurationSec: 5.5,
        pronunciationTips: "'guides are' 连读为 'guides-are'；'knowledgeable' 难词，/g/ 音不发音，发音为 /ˈnɒlɪdʒəbl/；'and will' 中的 d 失去爆破。",
        blanks: [2, 5, 8] // guides, knowledgeable, safety
      }
    ]
  }
];
