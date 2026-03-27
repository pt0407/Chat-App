const questions = [
    {
        question: "If it's 1910 and you want to ditch traditional art for abstract shapes, which movement are you joining?",
        options: ["Realism", "Romanticism", "Modernism", "Neoclassicism"],
        correct: 2
    },
    {
        question: "What was the main goal for Harlem Renaissance writers and musicians?",
        options: [
            "Moving all Black Americans back to Africa",
            "Moving away from stereotypes of African Americans",
            "Stopping the spread of Jazz",
            "Getting people to move back to rural farms"
        ],
        correct: 1
    },
    {
        question: "Which two 1920s inventions let millions of people experience the exact same culture at the same time?",
        options: [
            "TV and the Internet",
            "Newspapers and telegraphs",
            "Radio and movies",
            "Social media and streaming"
        ],
        correct: 2
    },
    {
        question: "How did \"Consumer Culture\" change how people in wealthy countries saw themselves after WWII?",
        options: [
            "They cared more about what they owned than what they believed",
            "They went back to hunting for their own food",
            "They stopped using tech to live a simpler life",
            "They only defined themselves by their military rank"
        ],
        correct: 0
    },
    {
        question: "Why do critics use the term \"throwaway culture\" when talking about American consumerism?",
        options: [
            "They think Americans are too charitable",
            "They hate the waste and pollution from disposable products",
            "They're mad that American products never break",
            "They want to throw away their own local traditions"
        ],
        correct: 1
    },
    {
        question: "Which Japanese animation style became a global hit, making up 60% of the world's cartoons by 2016?",
        options: ["Anime", "K-Pop", "Bollywood", "Mento"],
        correct: 0
    },
    {
        question: "Reggae music and Bob Marley are most closely linked to which religious movement?",
        options: ["Rastafari", "Hari Krishna", "Falun Gong", "Sufism"],
        correct: 0
    },
    {
        question: "The Olympics are a mix of \"Nationalism\" and \"Internationalism\" because athletes represent their home countries while:",
        options: [
            "Giving up their citizenship to play",
            "Bringing people together from almost every nation",
            "Being forced to only speak English",
            "Competing for one single global government"
        ],
        correct: 1
    },
    {
        question: "Why do athletes like Hajar Abulfazi wear a hijab while playing global sports like soccer?",
        options: [
            "To show they can reach sports goals while respecting their religion",
            "Because they aren't allowed to wear any other gear",
            "To hide their identity from other players",
            "To get a physical advantage in the game"
        ],
        correct: 0
    },
    {
        question: "How does the Chinese government use social media for political control?",
        options: [
            "By giving everyone unfiltered access to Facebook",
            "By censoring criticism of the Party on apps like WeChat",
            "By letting people vote for leaders on Twitter",
            "By banning all digital communication"
        ],
        correct: 1
    }
];

let currentQuestion = 0;
let score = 0;
let startTime = 0;
let timerInterval = null;
let userAnswers = [];

const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
};

const elements = {
    startBtn: document.getElementById('start-btn'),
    viewLeaderboardBtn: document.getElementById('view-leaderboard-btn'),
    timer: document.getElementById('timer'),
    questionCounter: document.getElementById('question-counter'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    nextBtn: document.getElementById('next-btn'),
    submitQuizBtn: document.getElementById('submit-quiz-btn'),
    finalScore: document.getElementById('final-score'),
    accuracy: document.getElementById('accuracy'),
    finalTime: document.getElementById('final-time'),
    playerName: document.getElementById('player-name'),
    submitScoreBtn: document.getElementById('submit-score-btn'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    noScores: document.getElementById('no-scores'),
    playAgainBtn: document.getElementById('play-again-btn'),
    backToStartBtn: document.getElementById('back-to-start-btn')
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startQuiz() {
    currentQuestion = 0;
    score = 0;
    userAnswers = [];
    startTime = Date.now();
    showScreen('quiz');
    startTimer();
    loadQuestion();
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function loadQuestion() {
    const question = questions[currentQuestion];
    elements.questionText.textContent = question.question;
    elements.questionCounter.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;

    elements.optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
        optionDiv.addEventListener('click', () => selectOption(index, optionDiv));
        elements.optionsContainer.appendChild(optionDiv);
    });

    elements.nextBtn.style.display = 'none';
    elements.submitQuizBtn.style.display = 'none';
}

function selectOption(selectedIndex, selectedDiv) {
    const allOptions = document.querySelectorAll('.option');

    if (allOptions[0].classList.contains('disabled')) {
        return;
    }

    allOptions.forEach(opt => opt.classList.remove('selected'));
    selectedDiv.classList.add('selected');

    allOptions.forEach(opt => opt.classList.add('disabled'));

    const question = questions[currentQuestion];
    userAnswers[currentQuestion] = selectedIndex;

    if (selectedIndex === question.correct) {
        selectedDiv.classList.add('correct');
        score++;
    } else {
        selectedDiv.classList.add('incorrect');
        allOptions[question.correct].classList.add('correct');
    }

    setTimeout(() => {
        if (currentQuestion < questions.length - 1) {
            elements.nextBtn.style.display = 'block';
        } else {
            elements.submitQuizBtn.style.display = 'block';
        }
    }, 500);
}

function nextQuestion() {
    currentQuestion++;
    loadQuestion();
}

function submitQuiz() {
    stopTimer();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const accuracyPercent = Math.round((score / questions.length) * 100);

    elements.finalScore.textContent = `${score}/${questions.length}`;
    elements.accuracy.textContent = `${accuracyPercent}%`;
    elements.finalTime.textContent = timeString;

    showScreen('result');
}

async function submitScore() {
    const playerName = elements.playerName.value.trim();

    if (!playerName) {
        alert('Please enter your name!');
        return;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const accuracyPercent = Math.round((score / questions.length) * 100);

    const scoreData = {
        name: playerName,
        score: score,
        total: questions.length,
        time: elapsed,
        accuracy: accuracyPercent
    };

    elements.submitScoreBtn.disabled = true;
    elements.submitScoreBtn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_URL}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scoreData)
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        showLeaderboard();
    } catch (err) {
        console.error('Error submitting score:', err);
        alert('Failed to submit score. Please try again.');
        elements.submitScoreBtn.disabled = false;
        elements.submitScoreBtn.textContent = 'Submit Score';
    }
}

async function showLeaderboard() {
    elements.leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';
    elements.noScores.style.display = 'none';
    showScreen('leaderboard');

    try {
        const response = await fetch(`${API_URL}/api/leaderboard`);
        if (!response.ok) throw new Error('Server error');
        const leaderboard = await response.json();

        if (!leaderboard || leaderboard.length === 0) {
            elements.leaderboardBody.innerHTML = '';
            elements.noScores.style.display = 'block';
        } else {
            elements.noScores.style.display = 'none';
            elements.leaderboardBody.innerHTML = leaderboard.map((entry, index) => {
                const minutes = Math.floor(entry.time / 60);
                const seconds = entry.time % 60;
                const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${entry.name}</td>
                        <td>${entry.score}/${entry.total}</td>
                        <td>${timeString}</td>
                        <td>${entry.accuracy}%</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        elements.leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load leaderboard</td></tr>';
    }
}

function resetQuiz() {
    elements.playerName.value = '';
    showScreen('start');
}

elements.startBtn.addEventListener('click', startQuiz);
elements.viewLeaderboardBtn.addEventListener('click', showLeaderboard);
elements.nextBtn.addEventListener('click', nextQuestion);
elements.submitQuizBtn.addEventListener('click', submitQuiz);
elements.submitScoreBtn.addEventListener('click', submitScore);
elements.playAgainBtn.addEventListener('click', startQuiz);
elements.backToStartBtn.addEventListener('click', resetQuiz);

elements.playerName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitScore();
    }
});
