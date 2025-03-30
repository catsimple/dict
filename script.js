// --- DOM Element References ---
const englishRow = document.getElementById('english-row');
const chineseRow = document.getElementById('chinese-row');
const scoreDisplay = document.getElementById('score');
const resetButton = document.getElementById('reset-button');
const hintImage = document.getElementById('hint-image');
const hintEnglish = document.getElementById('hint-english');
const hintChinese = document.getElementById('hint-chinese');
let hintDescription; // Assigned in DOMContentLoaded
let matchedPairsContainer; // Assigned in DOMContentLoaded
let permanentHintArea; // Assigned in DOMContentLoaded
let hintPlaceholder;   // Assigned in DOMContentLoaded
let hintContentWrapper;// Assigned in DOMContentLoaded

// Game Settings
const ROUND_SIZE = 10; // Number of word pairs per round
const MISMATCH_PENALTY = 2; // Points deducted for mismatch
const MATCH_POINTS = 10; // Points awarded for match
const ROUND_COMPLETE_DELAY = 300; // ms delay for round complete alert
const MISMATCH_ANIMATION_DURATION = 600; // ms, should match CSS shake + buffer

// Game State Variables
let fullWordList = [];
let currentRoundWords = [];
let firstSelectedWord = null;
let secondSelectedWord = null;
let score = 0;
let matchedPairs = 0;
let totalPairsInRound = 0;
let isChecking = false;
let initialLoadComplete = false;

// --- 函数 (Functions) ---

/**
 * @async
 * @function loadFullWordList
 * @description Loads the entire word list from dict.json if it hasn't been loaded yet.
 *              Validates the fetched data.
 * @returns {Promise<boolean>} A promise that resolves to true if loading and validation succeed, false otherwise.
 */
async function loadFullWordList() {
    if (initialLoadComplete) {
        return true;
    }
    try {
        const response = await fetch('dict.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        fullWordList = await response.json();

        // Validate data structure and content
        if (!Array.isArray(fullWordList) || fullWordList.length === 0) {
            console.error("Word data failed to load or is empty!");
            englishRow.innerHTML = '<p style="color: red;">加载单词数据失败或为空！</p>';
             if(resetButton) resetButton.disabled = true;
            return false;
        }
        if (fullWordList.some(word => typeof word.english === 'undefined' || typeof word.chinese === 'undefined')) {
             console.error("Critical word data fields (English or Chinese) are missing!");
             englishRow.innerHTML = '<p style="color: red;">单词数据格式错误 (缺少英文/中文)!</p>';
             if(resetButton) resetButton.disabled = true;
             return false;
        }
        // Warn about missing optional fields
        if (fullWordList.some(word => typeof word.image === 'undefined')) {
            console.warn("Some word data entries are missing the 'image' field.");
        }
        if (fullWordList.some(word => typeof word.description === 'undefined')) {
             console.warn("Some word data entries are missing the 'description' field.");
        }

        initialLoadComplete = true;
        console.log(`Successfully loaded ${fullWordList.length} word pairs.`);
        return true;

    } catch (error) {
        console.error("Error loading word data:", error);
        englishRow.innerHTML = `<p style="color: red;">加载单词数据时出错: ${error.message}</p>`;
        if(resetButton) resetButton.disabled = true;
        return false;
    }
}

/**
 * @function resetHintArea
 * @description Resets the permanent hint area to its initial placeholder state.
 */
function resetHintArea() {
    if (!permanentHintArea || !hintPlaceholder || !hintContentWrapper || !hintImage || !hintEnglish || !hintChinese || !hintDescription) {
        console.warn("Cannot reset hint area, elements missing.");
        return;
    }
    // Hide content, show placeholder
    hintContentWrapper.style.display = 'none';
    hintPlaceholder.style.display = 'block';

    // Clear content
    hintImage.src = '';
    hintImage.alt = '单词图片'; // Reset alt text
    hintImage.style.display = 'none';
    hintEnglish.textContent = '';
    hintChinese.textContent = '';
    hintDescription.textContent = '';
    hintDescription.style.display = 'none';
}


/**
 * @async
 * @function initializeRound
 * @description Sets up or resets a game round: loads data, clears state/UI, selects words, and creates elements.
 */
async function initializeRound() {
    const loaded = await loadFullWordList();
    if (!loaded) {
         console.error("Initialization failed because word list could not be loaded.");
         return;
    }

    resetHintArea(); // Reset the permanent hint area first

    // Reset game state variables
    score = 0;
    matchedPairs = 0;
    firstSelectedWord = null;
    secondSelectedWord = null;
    isChecking = false;
    currentRoundWords = [];

    // Clear word rows and matched pairs
    englishRow.innerHTML = '';
    chineseRow.innerHTML = '';
    if (matchedPairsContainer) {
        matchedPairsContainer.innerHTML = '';
    } else {
        console.error("CRITICAL: matchedPairsContainer element not found during round initialization!");
    }

    // Update score display and reset button state
    updateScore();
    if(resetButton) {
        resetButton.disabled = false;
        resetButton.textContent = '重置/下一轮';
    }

    // Select words for the round
    selectWordsForRound();

    // Create and display word elements
    if (currentRoundWords.length > 0) {
        totalPairsInRound = currentRoundWords.length;
        createWordElements();
        console.log(`Starting round with ${totalPairsInRound} pairs.`);
    } else {
        englishRow.innerHTML = '<p>没有足够的单词开始新回合。</p>';
        console.warn("No words selected for the round.");
        if(resetButton) resetButton.disabled = true;
    }
}

/**
 * @function selectWordsForRound
 * @description Selects a random subset of words from the fullWordList for the current round.
 */
function selectWordsForRound() {
    if (fullWordList.length === 0) {
        currentRoundWords = [];
        return;
    }
    const shuffledFullList = shuffleArray([...fullWordList]);
    const count = Math.min(ROUND_SIZE, shuffledFullList.length);
    currentRoundWords = shuffledFullList.slice(0, count);
}


/**
 * @function createWordElements
 * @description Creates and shuffles the DOM elements for English and Chinese words for the current round.
 */
function createWordElements() {
    const shuffledEnglish = shuffleArray([...currentRoundWords]);
    const shuffledChinese = shuffleArray([...currentRoundWords]);

    shuffledEnglish.forEach(wordData => {
        const wordBox = createWordBox(wordData.english, 'english');
        englishRow.appendChild(wordBox);
    });

    shuffledChinese.forEach(wordData => {
        const wordBox = createWordBox(wordData.chinese, 'chinese');
        chineseRow.appendChild(wordBox);
    });
}

/**
 * @function createWordBox
 * @description Creates a single word box DOM element.
 * @param {string} text - The word text to display.
 * @param {string} language - 'english' or 'chinese'.
 * @returns {HTMLElement} The created word box div element.
 */
function createWordBox(text, language) {
    const box = document.createElement('div');
    box.classList.add('word-box');
    const content = document.createElement('span');
    content.classList.add('word-content');
    content.textContent = text;
    box.appendChild(content);
    box.dataset.language = language;
    box.dataset.value = text;
    box.addEventListener('click', handleWordClick);
    return box;
}

/**
 * @function handleWordClick
 * @description Handles click events on word boxes, manages selection state, and triggers match checks.
 * @param {Event} event - The click event object.
 */
function handleWordClick(event) {
    const clickedWord = event.currentTarget;
    if (isChecking || clickedWord.classList.contains('placeholder')) { // Placeholder check likely unused
        return;
    }

    // Deselection Logic
    if (firstSelectedWord === clickedWord) {
        clickedWord.classList.remove('selected');
        firstSelectedWord = null;
        // Defensive clear of second selection (though unlikely needed here)
        if (secondSelectedWord) {
             secondSelectedWord.classList.remove('selected');
             secondSelectedWord = null;
        }
        return;
    }

    // Selection Logic
    if (!firstSelectedWord) {
        firstSelectedWord = clickedWord;
        clickedWord.classList.add('selected');
    } else if (!secondSelectedWord) {
        if (clickedWord.dataset.language !== firstSelectedWord.dataset.language) {
            // Potential match (different languages)
            secondSelectedWord = clickedWord;
            clickedWord.classList.add('selected');
            isChecking = true;
            setTimeout(checkMatch, 100); // Short delay for visual feedback
        } else {
             // Switch selection (same language clicked)
             firstSelectedWord.classList.remove('selected');
             firstSelectedWord = clickedWord;
             clickedWord.classList.add('selected');
             // secondSelectedWord remains null
        }
    }
    // If both are selected, isChecking prevents further clicks until resolved.
}


/**
 * @function checkMatch
 * @description Checks if the two selected words form a correct pair based on the fullWordList.
 */
function checkMatch() {
    if (!firstSelectedWord || !secondSelectedWord) {
        console.error("checkMatch called without two selected words.");
        isChecking = false; // Unlock in case of error
        return;
    }

    let englishValue, chineseValue;
    let englishBox, chineseBox;

    if (firstSelectedWord.dataset.language === 'english') {
        englishValue = firstSelectedWord.dataset.value;
        englishBox = firstSelectedWord;
        chineseValue = secondSelectedWord.dataset.value;
        chineseBox = secondSelectedWord;
    } else {
        englishValue = secondSelectedWord.dataset.value;
        englishBox = secondSelectedWord;
        chineseValue = firstSelectedWord.dataset.value;
        chineseBox = firstSelectedWord;
    }

    const correctPair = fullWordList.find(pair => pair.english === englishValue && pair.chinese === chineseValue);

    if (correctPair) {
        handleMatch(englishBox, chineseBox, correctPair);
    } else {
        handleMismatch(firstSelectedWord, secondSelectedWord);
    }
}

/**
 * @function handleMatch
 * @description Handles successful word pair matching. Updates score, moves pair to top container, shows hint, and checks for round completion.
 * @param {HTMLElement} englishBox - The matched English word box element.
 * @param {HTMLElement} chineseBox - The matched Chinese word box element.
 * @param {object} pairData - The data object for the matched pair from fullWordList.
 */
function handleMatch(englishBox, chineseBox, pairData) {
    score += MATCH_POINTS;
    matchedPairs++;
    updateScore();

    showHint(pairData); // Display hint details in the permanent area

    const mergedBox = document.createElement('div');
    mergedBox.classList.add('merged-pair');
    mergedBox.dataset.english = pairData.english; // Store key for re-clicking
    mergedBox.innerHTML = `
        <span class="merged-english">${pairData.english}</span>
        <span class="merged-chinese">${pairData.chinese}</span>
    `;

    if (matchedPairsContainer) {
        // mergedBox.style.cursor = 'pointer'; // Can be set in CSS directly now
        matchedPairsContainer.appendChild(mergedBox);
    } else {
         console.error("Error: matchedPairsContainer element is not available when handling match.");
    }

    englishBox?.remove();
    chineseBox?.remove();

    firstSelectedWord = null;
    secondSelectedWord = null;
    isChecking = false;

    if (matchedPairs === totalPairsInRound && totalPairsInRound > 0) {
         setTimeout(() => {
            alert(`恭喜！完成了本回合！得分: ${score}. 点击 "重置/下一轮" 开始新回合。`);
            if(resetButton) resetButton.textContent = '开始新回合';
        }, ROUND_COMPLETE_DELAY);
    }
}

/**
 * @function handleMismatch
 * @description Handles incorrect word pair matching. Decreases score and applies visual feedback (shake).
 * @param {HTMLElement} wordBox1 - The first selected word box.
 * @param {HTMLElement} wordBox2 - The second selected word box.
 */
function handleMismatch(wordBox1, wordBox2) {
    score = Math.max(0, score - MISMATCH_PENALTY);
    updateScore();

    wordBox1?.classList.add('shake');
    wordBox2?.classList.add('shake');

    setTimeout(() => {
        if (wordBox1?.parentElement) {
             wordBox1.classList.remove('selected', 'shake');
        }
        if (wordBox2?.parentElement) {
            wordBox2.classList.remove('selected', 'shake');
        }
        firstSelectedWord = null;
        secondSelectedWord = null;
        isChecking = false;
    }, MISMATCH_ANIMATION_DURATION);
}


/**
 * @function showHint
 * @description Displays hint details in the permanent hint area.
 * @param {object} pairData - The data object (from fullWordList) for the word pair.
 */
function showHint(pairData) {
    if (!permanentHintArea || !hintPlaceholder || !hintContentWrapper || !hintImage || !hintEnglish || !hintChinese || !hintDescription) {
        console.error("Cannot show hint, one or more hint area elements are missing.");
        return;
    }

    // Hide placeholder, show content wrapper
    hintPlaceholder.style.display = 'none';
    hintContentWrapper.style.display = 'block';

    // --- Update Image ---
    if (pairData.image && String(pairData.image).trim() !== '') {
        hintImage.src = pairData.image;
        hintImage.alt = `${pairData.english} / ${pairData.chinese}`; // Dynamic alt text
        hintImage.style.display = 'block';
        hintImage.onerror = () => {
            console.warn(`Failed to load hint image: ${pairData.image}`);
            hintImage.style.display = 'none';
            hintImage.onerror = null;
        };
        // Ensure display remains 'block' on successful load (belt-and-suspenders)
        hintImage.onload = () => {
             hintImage.style.display = 'block';
             hintImage.onload = null; // Remove handler after success
        };
    } else {
        hintImage.style.display = 'none';
        hintImage.src = '';
        hintImage.alt = '无图片';
    }

    // --- Update Text Content ---
    hintEnglish.textContent = pairData.english || 'N/A';
    hintChinese.textContent = pairData.chinese || 'N/A';

    // --- Update Description ---
    if (pairData.description && String(pairData.description).trim() !== '') {
        hintDescription.textContent = pairData.description;
        hintDescription.style.display = 'block'; // Show paragraph
    } else {
        hintDescription.textContent = '';
        hintDescription.style.display = 'none'; // Hide paragraph
    }

    // Optional: Scroll the hint area into view if needed, especially on smaller screens
    // Consider only doing this if triggered by a merged pair click, not every match?
    // permanentHintArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/**
 * @function updateScore
 * @description Updates the score display in the HTML.
 */
function updateScore() {
    if(scoreDisplay) {
        scoreDisplay.textContent = score;
    } else {
        console.warn("Score display element not found.");
    }
}

/**
 * @function shuffleArray
 * @description Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to be shuffled.
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * @function handleMergedPairClick
 * @description Handles click events on the container for matched pairs. Shows hint for the clicked pair.
 * @param {Event} event - The click event object.
 */
function handleMergedPairClick(event) {
    const clickedPairElement = event.target.closest('.merged-pair');
    if (!clickedPairElement) return;

    const englishWord = clickedPairElement.dataset.english;
    if (!englishWord) {
        console.warn("Clicked merged pair is missing 'data-english'.");
        return;
    }
    const pairData = fullWordList.find(pair => pair.english === englishWord);
    if (pairData) {
        showHint(pairData); // Show hint in the permanent area

        // --- Scroll commented out - Less necessary with sticky side panel ---
        // // Optionally scroll into view when specifically clicking a merged pair
        // permanentHintArea?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        console.warn(`Data not found for merged pair clicked: ${englishWord}`);
    }
}


// --- 事件监听 (Event Listeners) ---

if(resetButton) {
    resetButton.addEventListener('click', initializeRound);
} else {
     console.error("CRITICAL: Reset button element not found!");
}


// --- 初始化游戏 (Game Initialization) ---
document.addEventListener('DOMContentLoaded', () => {
    // Get references AFTER DOM is ready
    matchedPairsContainer = document.getElementById('matched-pairs-container');
    hintDescription = document.getElementById('hint-description');
    permanentHintArea = document.getElementById('permanent-hint-area');
    hintPlaceholder = document.getElementById('hint-placeholder');
    hintContentWrapper = document.getElementById('hint-content-wrapper');

    // Update essential elements check
    let essentialElementsMissing = false;
    const essentialIds = [
        'english-row', 'chinese-row', 'score', 'reset-button',
        'hint-image', 'hint-english', 'hint-chinese', 'hint-description', // Hint Content
        'matched-pairs-container',
        'permanent-hint-area', 'hint-placeholder', 'hint-content-wrapper' // Hint Area Structure
    ];
    essentialIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`CRITICAL FAILURE: HTML element with ID "${id}" not found!`);
            essentialElementsMissing = true;
        }
         // Store references obtained during check if needed globally and not already assigned
         // e.g. if hintImage, hintEnglish etc. weren't global vars:
         // if (id === 'hint-image') hintImage = element;
    });

    if (essentialElementsMissing) {
         const gameContainer = document.querySelector('.game-container');
         if(gameContainer) {
             const errorMsg = document.createElement('p');
             errorMsg.textContent = "错误：游戏无法初始化，缺少必要的界面元素。请检查HTML结构或联系管理员。";
             errorMsg.style.color = "red";
             errorMsg.style.fontWeight = "bold";
             errorMsg.style.marginTop = "20px";
             const referenceNode = englishRow || gameContainer.firstChild; // Insert before english row or at start
             gameContainer.insertBefore(errorMsg, referenceNode);
         }
        if (resetButton) resetButton.disabled = true;
        return; // Stop initialization
    }

    // --- Attach Event Listeners ---

    // Listener for clicks within the matched pairs container (uses event delegation)
    if (matchedPairsContainer) {
        matchedPairsContainer.addEventListener('click', handleMergedPairClick);
    }

    // --- Start the Game ---
    loadFullWordList()
        .then((loadedSuccessfully) => {
             if (loadedSuccessfully) {
                 initializeRound(); // Includes resetting the hint area now
             } else {
                 // Error message already shown by loadFullWordList
                 console.error("Game initialization aborted due to word list loading failure.");
                 if (resetButton) resetButton.disabled = true;
             }
        })
        .catch(error => {
            console.error("Unexpected error during game initialization:", error);
             const gameContainer = document.querySelector('.game-container');
             if(gameContainer) {
                const errorMsg = document.createElement('p');
                errorMsg.textContent = `游戏初始化失败: ${error.message}`;
                errorMsg.style.color = "red";
                errorMsg.style.fontWeight = "bold";
                const referenceNode = englishRow || gameContainer.firstChild;
                gameContainer.insertBefore(errorMsg, referenceNode);
             }
            if (resetButton) resetButton.disabled = true;
        });
});