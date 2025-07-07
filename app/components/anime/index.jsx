import React, { useState, useEffect, useCallback } from 'react';
import "./anime.css";
// Main App Component - Simulates a Next.js page
export default function Anime() {
    // Game state management: 'menu', 'playing', 'gameover'
    const [gameState, setGameState] = useState('menu');
    // Game mode: 'character' or 'episodes'
    const [gameMode, setGameMode] = useState(null);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    // Timer state: starts at 60s
    const [timeLeft, setTimeLeft] = useState(60);
    // State to track incorrect answers per level
    const [incorrectAnswers, setIncorrectAnswers] = useState(0);
    // Loading state for API calls
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    // Feedback state for user answers: 'correct', 'incorrect', or ''
    const [feedback, setFeedback] = useState('');
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    // --- API & Question Logic ---

    // Fetches a list of top anime from the Jikan API
    const fetchTopAnime = async (page = 1) => {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Failed to fetch top anime:", error);
            return [];
        }
    };

    // Fetches characters for a specific anime ID
    const fetchAnimeCharacters = async (animeId) => {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            // Filter for main characters with images
            return data.data.filter(c => c.role === 'Main' && c.character.images?.jpg.image_url);
        } catch (error) {
            console.error("Failed to fetch characters:", error);
            return [];
        }
    };

    // Generates questions for the 'character' game mode
    const generateCharacterQuestions = useCallback(async () => {
        setLoading(true);
        let generatedQuestions = [];
        let attempts = 0;
        const animeList = await fetchTopAnime(level); // Fetch different anime per level

        while (generatedQuestions.length < 5 && attempts < 20) {
            if (animeList.length === 0) break;
            const randomAnime = animeList[Math.floor(Math.random() * animeList.length)];
            const characters = await fetchAnimeCharacters(randomAnime.mal_id);

            if (characters.length >= 4) {
                const shuffledChars = [...characters].sort(() => 0.5 - Math.random());
                const correctCharacter = shuffledChars[0];
                const otherOptions = shuffledChars.slice(1, 4).map(c => c.character.name);

                const options = [correctCharacter.character.name, ...otherOptions].sort(() => 0.5 - Math.random());

                generatedQuestions.push({
                    type: 'character',
                    image: correctCharacter.character.images.jpg.image_url,
                    options: options,
                    correctAnswer: correctCharacter.character.name,
                });
            }
            attempts++;
            await new Promise(res => setTimeout(res, 400));
        }
        setQuestions(generatedQuestions);
        setLoading(false);
    }, [level]);

    // Generates questions for the 'episodes' game mode
    const generateEpisodeQuestions = useCallback(async () => {
        setLoading(true);
        let generatedQuestions = [];
        let attempts = 0;
        const animeList = await fetchTopAnime(level);

        while (generatedQuestions.length < 5 && attempts < 20) {
            if (animeList.length === 0) break;
            const randomAnime = animeList[Math.floor(Math.random() * animeList.length)];

            if (randomAnime && randomAnime.episodes) {
                const correctAnswer = randomAnime.episodes;
                let options = [correctAnswer];
                while (options.length < 4) {
                    const offset = Math.floor(Math.random() * 20) + 1;
                    const incorrectAnswer = Math.random() > 0.5 ? correctAnswer + offset : Math.max(1, correctAnswer - offset);
                    if (!options.includes(incorrectAnswer)) {
                        options.push(incorrectAnswer);
                    }
                }
                options.sort(() => 0.5 - Math.random());

                generatedQuestions.push({
                    type: 'episodes',
                    animeName: randomAnime.title,
                    options: options,
                    correctAnswer: correctAnswer,
                });
            }
            attempts++;
            await new Promise(res => setTimeout(res, 400));
        }
        setQuestions(generatedQuestions);
        setLoading(false);
    }, [level]);

    // --- Game Flow & State Hooks ---

    // Timer effect
    useEffect(() => {
        if (gameState !== 'playing' || loading) return;

        if (timeLeft <= 0) {
            setGameState('gameover');
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [gameState, timeLeft, loading]);

    // Level-up effect to set time
    useEffect(() => {
        const newTime = level >= 5 ? 30 : 60;
        setTimeLeft(newTime);
    }, [level, gameState]);

    // Function to start the game
    const startGame = (mode) => {
        setGameMode(mode);
        setLevel(1);
        setScore(0);
        setCurrentQuestionIndex(0);
        setIncorrectAnswers(0);
        setTimeLeft(60);
        setGameState('playing');
    };

    // Fetch questions when game starts or level changes
    useEffect(() => {
        if (gameState === 'playing') {
            if (gameMode === 'character') {
                generateCharacterQuestions();
            } else if (gameMode === 'episodes') {
                generateEpisodeQuestions();
            }
        }
    }, [gameState, gameMode, level, generateCharacterQuestions, generateEpisodeQuestions]);


    // Function to handle user's answer
    const handleAnswer = (answer) => {
        if (feedback) return; // Prevent multiple clicks

        const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
        setSelectedAnswer(answer);

        if (isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 10 * level);
        } else {
            setFeedback('incorrect');
            setIncorrectAnswers(prev => prev + 1);
        }

        // Move to next question or level after a delay
        setTimeout(() => {
            setFeedback('');
            setSelectedAnswer(null);

            const isLevelEnd = currentQuestionIndex === questions.length - 1;

            if (isLevelEnd) {
                const finalIncorrectCount = isCorrect ? incorrectAnswers : incorrectAnswers + 1;

                if (finalIncorrectCount >= 4) {
                    // Repeat level
                    setCurrentQuestionIndex(0);
                    setIncorrectAnswers(0);
                    // Refetch questions for the same level
                    if (gameMode === 'character') {
                        generateCharacterQuestions();
                    } else if (gameMode === 'episodes') {
                        generateEpisodeQuestions();
                    }
                } else {
                    // Advance to next level
                    setLevel(prev => prev + 1);
                    setCurrentQuestionIndex(0);
                    setIncorrectAnswers(0);
                }
            } else {
                // Next question
                setCurrentQuestionIndex(prev => prev + 1);
            }
        }, 1500);
    };

    // Function to restart the game
    const restartGame = () => {
        setGameState('menu');
        setGameMode(null);
        setScore(0);
        setLevel(1);
        setTimeLeft(60);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setIncorrectAnswers(0);
    };

    // --- Render Logic ---

    const renderContent = () => {
        switch (gameState) {
            case 'playing':
                return <GamePlay
                    level={level}
                    score={score}
                    timeLeft={timeLeft}
                    loading={loading}
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    feedback={feedback}
                    selectedAnswer={selectedAnswer}
                    handleAnswer={handleAnswer}
                    gameMode={gameMode}
                    incorrectAnswers={incorrectAnswers}
                />;
            case 'gameover':
                return <GameOverScreen score={score} level={level} onRestart={restartGame} />;
            case 'menu':
            default:
                return <GameMenu onStart={startGame} />;
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl mx-auto">
                <header className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>Anime Knowledge Quest</h1>
                    <p className="text-slate-400 mt-2">Test Your Otaku Skills!</p>
                </header>
                <main className="bg-slate-800 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 md:p-8 min-h-[450px] flex flex-col justify-center">
                    {renderContent()}
                </main>
                <footer className="text-center mt-6 text-slate-500 text-sm">
                    <p>Game developed by writemess.</p>
                </footer>
            </div>
        </div>
    );
}

// --- UI Components ---

const GameMenu = ({ onStart }) => (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
        <h2 className="text-3xl font-bold text-white mb-8">Choose Your Challenge</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <button
                onClick={() => onStart('character')}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg"
            >
                Guess The Character
            </button>
            <button
                onClick={() => onStart('episodes')}
                className="bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-bold py-4 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg"
            >
                Guess The Episodes
            </button>
        </div>
    </div>
);

const GamePlay = ({ level, score, timeLeft, loading, questions, currentQuestionIndex, feedback, selectedAnswer, handleAnswer, gameMode, incorrectAnswers }) => {

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading || questions.length === 0) {
        return <LoadingSpinner />;
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="animate-fade-in">
            <div className="flex flex-wrap justify-between items-center mb-6 text-md gap-2">
                <div className="bg-slate-700 px-3 py-2 rounded-lg"><span className="font-bold text-cyan-400">Level:</span> {level}</div>
                <div className="bg-slate-700 px-3 py-2 rounded-lg"><span className="font-bold text-green-400">Score:</span> {score}</div>
                <div className="bg-slate-700 px-3 py-2 rounded-lg"><span className="font-bold text-yellow-400">Fails:</span> {incorrectAnswers} / 4</div>
                <div className="bg-slate-700 px-3 py-2 rounded-lg"><span className="font-bold text-red-400">Time:</span> {formatTime(timeLeft)}</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg text-center">
                {gameMode === 'character' ? (
                    <>
                        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-slate-300">Who is this character?</h3>
                        <div className="flex justify-center items-center h-64 mb-4">
                            {/* // eslint-disable-next-line @next/next/no-img-element */}
                            <img src={currentQuestion.image} raw={currentQuestion.image} alt="Character" className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
                        </div>
                    </>
                ) : (
                    <h3 className="text-xl md:text-2xl font-semibold my-12 text-slate-300">How many episodes does <span className="text-cyan-400 font-bold">{currentQuestion.animeName}</span> have?</h3>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = currentQuestion.correctAnswer === option;

                    let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                    if (feedback && isSelected) {
                        buttonClass = feedback === 'correct' ? 'bg-green-500' : 'bg-red-500';
                    } else if (feedback && isCorrect) {
                        buttonClass = 'bg-green-500';
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            disabled={!!feedback}
                            className={`w-full p-4 rounded-lg text-white font-semibold transition-all duration-300 ${buttonClass} disabled:opacity-70 disabled:cursor-not-allowed`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const GameOverScreen = ({ score, level, onRestart }) => (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
        <h2 className="text-5xl font-bold text-red-500 mb-4">Game Over</h2>
        <p className="text-2xl text-slate-300 mb-2">You reached <span className="font-bold text-cyan-400">Level {level}</span></p>
        <p className="text-3xl text-white mb-8">Final Score: <span className="font-bold text-green-400">{score}</span></p>
        <button
            onClick={onRestart}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105"
        >
            Play Again
        </button>
    </div>
);

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-t-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400">Fetching Questions...</p>
    </div>
);


