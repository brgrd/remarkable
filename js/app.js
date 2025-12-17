let editorState = {
	content: '',
	sidebarCollapsed: false,
	previewVisible: true,
	prettifySnapshot: null,
	undoTimeout: null,
	modalResolve: null,
	cursor: {
		start: 0,
		end: 0,
		isKnown: false
	}
};

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
const previewToggle = document.getElementById('previewToggle');
const previewPane = document.querySelector('.preview-pane');
const saveIndicator = document.getElementById('saveIndicator');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const prettifyBtn = document.getElementById('prettifyBtn');
const exportBtn = document.getElementById('exportBtn');
const undoActionBtn = document.getElementById('undoActionBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const undoToast = document.getElementById('undoToast');
const undoBtn = document.getElementById('undoBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const closeShortcuts = document.getElementById('closeShortcuts');
const formatButtons = document.querySelectorAll('.format-btn');
const shortcutsHint = document.getElementById('shortcutsHint');

const wordCountDisplay = document.getElementById('wordCount');
const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
const validateBtn = document.getElementById('validateBtn');

const dropZone = document.getElementById('dropZone');
const editorPane = document.querySelector('.editor-pane');

const customModal = document.getElementById('customModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

const findInput = document.getElementById('findInput');
const replaceInput = document.getElementById('replaceInput');
const caseSensitive = document.getElementById('caseSensitive');
const wholeWord = document.getElementById('wholeWord');
const regexMode = document.getElementById('regexMode');
const selectionOnly = document.getElementById('selectionOnly');
const findResults = document.getElementById('findResults');
const findPrevBtn = document.getElementById('findPrevBtn');
const findNextBtn = document.getElementById('findNextBtn');
const replaceBtn = document.getElementById('replaceBtn');
const replaceAllBtn = document.getElementById('replaceAllBtn');
const closeFindReplace = document.getElementById('closeFindReplace');
const findReplacePanel = document.getElementById('findReplacePanel');
const templateDropdown = document.getElementById('templateDropdown');
const insertTemplateBtn = document.getElementById('insertTemplateBtn');
const editorHighlights = document.getElementById('editorHighlights');
const editorLintOverlay = document.getElementById('editorLintOverlay');
const editorGutter = document.getElementById('editorGutter');
const editorTooltip = document.getElementById('editorTooltip');

const lintBtn = document.getElementById('lintBtn');
const lintIssuesEl = document.getElementById('lintIssues');
const lintMD001 = document.getElementById('lintMD001');
const lintMD013 = document.getElementById('lintMD013');
const lintMD022 = document.getElementById('lintMD022');
const lintMD041 = document.getElementById('lintMD041');
const lintMD047 = document.getElementById('lintMD047');
const lintLineLength = document.getElementById('lintLineLength');

let findReplaceController = null;
let formattingController = null;
let persistenceController = null;
let uiController = null;
let previewController = null;
let filesController = null;

function captureEditorSelection() {
	if (!editor) return;
	const start = Number.isFinite(editor.selectionStart) ? editor.selectionStart : 0;
	const end = Number.isFinite(editor.selectionEnd) ? editor.selectionEnd : start;
	editorState.cursor = { start, end, isKnown: true };
}

function restoreEditorSelection({ forceEndIfUnknown = true } = {}) {
	if (!editor) return;
	const contentLength = editor.value.length;

	if (!editorState.cursor?.isKnown) {
		editor.focus();
		if (forceEndIfUnknown) {
			editor.setSelectionRange(contentLength, contentLength);
			editorState.cursor = { start: contentLength, end: contentLength, isKnown: true };
		}
		return;
	}

	const start = Math.max(0, Math.min(editorState.cursor.start, contentLength));
	const end = Math.max(0, Math.min(editorState.cursor.end, contentLength));
	editor.focus();
	editor.setSelectionRange(start, end);
}

function getEditorSelectionRange() {
	if (!editor) return { start: 0, end: 0, isKnown: false };
	if (!editorState.cursor?.isKnown) {
		return { start: editor.selectionStart || 0, end: editor.selectionEnd || 0, isKnown: false };
	}
	return { start: editorState.cursor.start, end: editorState.cursor.end, isKnown: true };
}

function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function getEditorMetrics() {
	const style = window.getComputedStyle(editor);
	const lineHeight = Number.parseFloat(style.lineHeight) || 25.2;
	const paddingTop = Number.parseFloat(style.paddingTop) || 24;
	return { lineHeight, paddingTop };
}

function updateLineNumbers() {
	if (!editorGutter || !editor) return;
	const lineCount = editor.value.split('\n').length || 1;
	const issuesByLine = lintState.issuesByLine;
	const digits = Math.max(2, String(lineCount).length);
	const editorStyle = window.getComputedStyle(editor);
	editorGutter.style.fontSize = editorStyle.fontSize;
	editorGutter.style.lineHeight = editorStyle.lineHeight;
	editorGutter.style.paddingTop = editorStyle.paddingTop;
	editorGutter.style.paddingBottom = editorStyle.paddingBottom;

	const gutterStyle = window.getComputedStyle(editorGutter);
	const paddingLeft = Number.parseFloat(gutterStyle.paddingLeft) || 0;
	const paddingRight = Number.parseFloat(gutterStyle.paddingRight) || 0;
	const borderRight = Number.parseFloat(gutterStyle.borderRightWidth) || 0;
	const extraPx = Math.ceil(paddingLeft + paddingRight + borderRight + 6);
	editorGutter.style.width = `calc(${digits}ch + ${extraPx}px)`;

	let html = '';
	for (let i = 1; i <= lineCount; i++) {
		const issueClass = issuesByLine?.has(i) ? ' issue' : '';
		html += `<span class="line${issueClass}">${i}</span>\n`;
	}
	editorGutter.innerHTML = html;
	editorGutter.scrollTop = editor.scrollTop;
}

function hideEditorTooltip() {
	if (!editorTooltip) return;
	editorTooltip.classList.remove('visible');
	editorTooltip.setAttribute('aria-hidden', 'true');
	editorTooltip.textContent = '';
}

function showEditorTooltipAt(x, y, text) {
	if (!editorTooltip || !text) return;
	editorTooltip.textContent = text;
	editorTooltip.style.left = `${x}px`;
	editorTooltip.style.top = `${y}px`;
	editorTooltip.classList.add('visible');
	editorTooltip.setAttribute('aria-hidden', 'false');
}

function getLineFromMouseEvent(e) {
	if (!editor) return null;
	const rect = editor.getBoundingClientRect();
	const { lineHeight, paddingTop } = getEditorMetrics();
	const localY = e.clientY - rect.top + editor.scrollTop - paddingTop;
	const lineIndex = Math.floor(localY / lineHeight);
	if (Number.isNaN(lineIndex) || lineIndex < 0) return null;
	return lineIndex + 1;
}

function showModal(options) {
	return uiController?.showModal
		? uiController.showModal(options)
		: Promise.resolve(false);
}

function setupModalListeners() {
	uiController?.setupModalListeners?.();
}

function showToast(message, duration) {
	uiController?.showToast?.(message, duration);
}

function showUndoToast() {
	uiController?.showUndoToast?.();
}

function hideUndoToast() {
	uiController?.hideUndoToast?.();
}

const templateData = window.TemplateData || { sections: {}, templateOrder: [] };
const sections = templateData.sections;
const templateOrder = templateData.templateOrder;

function init() {
	if (window.UI?.createUI) {
		uiController = window.UI.createUI({
			editorState,
			customModal,
			modalIcon,
			modalTitle,
			modalMessage,
			modalConfirm,
			modalCancel,
			undoToast,
			undoBtn
		});
	}

	if (window.Persistence?.createPersistence) {
		persistenceController = window.Persistence.createPersistence({
			editor,
			sidebar,
			editorState,
			saveToHistory,
			showModal
		});
		persistenceController.loadContent();
		persistenceController.loadTemplateVariables();
	} else {
		loadFromLocalStorage();
		loadTemplateVariables();
	}

	setupEventListeners();
	loadLintSettings();

	if (window.Preview?.createPreview) {
		previewController = window.Preview.createPreview({
			editor,
			previewEl: preview,
			wordCountEl: wordCountDisplay,
			parseMarkdown: (text) => marked.parse(text),
			debounce
		});
	}

	if (window.Files?.createFiles) {
		filesController = window.Files.createFiles({
			editor,
			fileInput,
			uploadBtn,
			copyMarkdownBtn,
			dropZone,
			editorPane,
			showModal,
			showToast,
			handleEditorInput,
			analyzeDocument
		});
		filesController.setupDragAndDrop();
		filesController.attachListeners();
	}

	if (window.FindReplace?.createFindReplace) {
		findReplaceController = window.FindReplace.createFindReplace({
			editor,
			findInput,
			replaceInput,
			caseSensitive,
			wholeWord,
			regexMode,
			selectionOnly,
			resultsEl: findResults,
			panelEl: findReplacePanel,
			highlightsEl: editorHighlights,
			getSelectionRange: getEditorSelectionRange
		});
	}

	if (window.Formatting?.createFormatting) {
		formattingController = window.Formatting.createFormatting({
			editor,
			editorState,
			saveToHistory,
			handleEditorInput,
			showUndoToast,
			hideUndoToast
		});
	}

	if (editor.value) {
		previewController?.updatePreview();
	}

	updateLineNumbers();
}

function loadFromLocalStorage() {
	if (!editor) return;
	const saved = localStorage.getItem('markdown-content');
	if (saved) {
		editor.value = saved;
		editorState.content = saved;
		saveToHistory();
	}
}

function loadTemplateVariables() {
	const savedVars = localStorage.getItem('templateVariables');
	if (!savedVars) return;
	try {
		const vars = JSON.parse(savedVars);
		[
			'usernameInput',
			'projectNameInput',
			'ticketNumberInput',
			'prTitleInput',
			'apiUrlInput',
			'contactEmailInput',
			'projectDescInput',
			'licenseTypeInput',
			'buildStatusInput',
			'buildVersionInput',
			'dateInput'
		].forEach((id) => {
			const el = document.getElementById(id);
			if (el && vars[id]) el.value = vars[id];
		});
	} catch (e) {
		console.error('Error restoring template variables:', e);
	}
}

const LINT_SETTINGS_KEY = 'lintSettings';

const lintState = {
	lastIssues: [],
	issuesByLine: new Set()
};

function getLintConfigFromUI() {
	return {
		enabled: {
			MD001: Boolean(lintMD001?.checked),
			MD013: Boolean(lintMD013?.checked),
			MD022: Boolean(lintMD022?.checked),
			MD041: Boolean(lintMD041?.checked),
			MD047: Boolean(lintMD047?.checked)
		},
		maxLineLength: Number.parseInt(lintLineLength?.value || '120', 10) || 120
	};
}

function loadLintSettings() {
	const raw = localStorage.getItem(LINT_SETTINGS_KEY);
	if (!raw) return;
	try {
		const settings = JSON.parse(raw);
		if (lintMD001) lintMD001.checked = settings?.enabled?.MD001 ?? lintMD001.checked;
		if (lintMD013) lintMD013.checked = settings?.enabled?.MD013 ?? lintMD013.checked;
		if (lintMD022) lintMD022.checked = settings?.enabled?.MD022 ?? lintMD022.checked;
		if (lintMD041) lintMD041.checked = settings?.enabled?.MD041 ?? lintMD041.checked;
		if (lintMD047) lintMD047.checked = settings?.enabled?.MD047 ?? lintMD047.checked;
		if (lintLineLength && settings?.maxLineLength) lintLineLength.value = String(settings.maxLineLength);
	} catch {
	}
}

function saveLintSettings() {
	try {
		localStorage.setItem(LINT_SETTINGS_KEY, JSON.stringify(getLintConfigFromUI()));
	} catch {
	}
}

function jumpToLine(lineNumber) {
	if (!editor) return;
	const lines = editor.value.split('\n');
	const index = Math.max(0, Math.min(lineNumber - 1, lines.length - 1));
	const startPos = charPosAtLineStart(lines, index);
	const endPos = startPos + (lines[index]?.length ?? 0);
	editor.focus();
	editor.setSelectionRange(startPos, endPos);
	captureEditorSelection();

	const { lineHeight, paddingTop } = getEditorMetrics();
	const targetTop = Math.max(0, index * lineHeight);
	const centerOffset = Math.max(0, (editor.clientHeight / 2) - paddingTop);
	editor.scrollTop = Math.max(0, targetTop - centerOffset);
}

function renderLintIssues(issues) {
	if (!lintIssuesEl) return;
	if (!issues || issues.length === 0) {
		lintIssuesEl.innerHTML = '<div class="lint-empty">No issues</div>';
		return;
	}

	lintIssuesEl.innerHTML = issues.map((issue) => {
		const rule = issue.rule || 'LINT';
		const line = issue.line || 0;
		const message = issue.message || '';
		return `<button type="button" class="lint-issue" data-line="${line}"><span class="lint-rule">${rule}</span><span class="lint-line">L${line}</span>${message}</button>`;
	}).join('');

	lintIssuesEl.querySelectorAll('.lint-issue').forEach((btn) => {
		btn.addEventListener('click', () => {
			const line = Number.parseInt(btn.dataset.line || '0', 10);
			if (line) jumpToLine(line);
		});
	});
}

function runLint() {
	if (!editor) return;
	const lintFn = window.Validation?.lintMarkdownContent;
	if (!lintFn) {
		renderLintIssues([{ rule: 'LINT', line: 0, message: 'Lint engine not loaded.' }]);
		return;
	}
	saveLintSettings();
	const issues = lintFn(editor.value, getLintConfigFromUI());
	lintState.lastIssues = issues;
	lintState.issuesByLine = new Set(issues.map(i => i.line).filter(Boolean));
	renderLintIssues(issues);
	updateLintDecorations();
	updateLineNumbers();
}

function updateLintDecorations() {
	if (!editor || !editorLintOverlay) return;
	const issuesByLine = {};
	for (const issue of lintState.lastIssues) {
		if (!issue?.line) continue;
		if (!issuesByLine[issue.line]) issuesByLine[issue.line] = [];
		issuesByLine[issue.line].push(issue);
	}

	const lines = editor.value.split('\n');
	let html = '';
	for (let i = 0; i < lines.length; i++) {
		const lineNumber = i + 1;
		const line = lines[i] ?? '';
		const isIssue = Boolean(issuesByLine[lineNumber]?.length);
		const cls = isIssue ? 'issue' : '';
		html += `<span class="${cls}">${line ? escapeHtml(line) : '&nbsp;'}</span>\n`;
	}
	editorLintOverlay.innerHTML = html;
	editorLintOverlay.scrollTop = editor.scrollTop;
	editorLintOverlay.scrollLeft = editor.scrollLeft;
}

const templateOptions = templateDropdown ? Array.from(templateDropdown.options) : [];
templateOptions.forEach(option => {
	if (!option.dataset.label) {
		option.dataset.label = option.textContent.trim();
	}
});

function updateTemplateDropdown() {
	if (!templateDropdown) return;
	const analysis = analyzeDocument();
	const options = templateDropdown.querySelectorAll('option');

	options.forEach(option => {
		const baseLabel = option.dataset.label ?? option.textContent.trim();

		if (!option.value) {
			option.textContent = baseLabel;
			option.classList.remove('template-option-added');
			return;
		}

		if (analysis[option.value]) {
			option.textContent = `${baseLabel} \u2022`;
			option.classList.add('template-option-added');
		} else {
			option.textContent = baseLabel;
			option.classList.remove('template-option-added');
		}
	});
}

function setupEventListeners() {
	setupModalListeners();

	editor.addEventListener('input', handleEditorInput);
	editor.addEventListener('input', captureEditorSelection);
	editor.addEventListener('select', captureEditorSelection);
	editor.addEventListener('keyup', captureEditorSelection);
	editor.addEventListener('mouseup', captureEditorSelection);
	editor.addEventListener('click', captureEditorSelection);
	editor.addEventListener('scroll', () => previewController?.syncScroll());
	editor.addEventListener('scroll', () => {
		if (editorGutter) editorGutter.scrollTop = editor.scrollTop;
		if (editorHighlights) {
			editorHighlights.scrollTop = editor.scrollTop;
			editorHighlights.scrollLeft = editor.scrollLeft;
		}
		if (editorLintOverlay) {
			editorLintOverlay.scrollTop = editor.scrollTop;
			editorLintOverlay.scrollLeft = editor.scrollLeft;
		}
		hideEditorTooltip();
	});
	editor.addEventListener('blur', () => {
		captureEditorSelection();
	});
	editor.addEventListener('mousemove', (e) => {
		if (!lintState.lastIssues?.length) return;
		const line = getLineFromMouseEvent(e);
		if (!line) {
			hideEditorTooltip();
			return;
		}
		const matches = lintState.lastIssues.filter(i => i.line === line);
		if (!matches.length) {
			hideEditorTooltip();
			return;
		}
		const editorRect = editor.getBoundingClientRect();
		const paneRect = editorPane.getBoundingClientRect();
		const x = Math.min(e.clientX - editorRect.left + 12, editorRect.width - 24);
		const y = Math.min(e.clientY - editorRect.top + 12, editorRect.height - 24);
		const message = matches.map(m => `${m.rule}: ${m.message}`).join(' • ');
		showEditorTooltipAt(editorRect.left - paneRect.left + x, editorRect.top - paneRect.top + y, message);
	});
	editor.addEventListener('mouseleave', () => hideEditorTooltip());

	sidebarToggle.addEventListener('click', toggleSidebar);
	mobileSidebarToggle.addEventListener('click', toggleSidebar);

	templateDropdown?.addEventListener('change', () => {
		if (insertTemplateBtn) {
			insertTemplateBtn.disabled = !templateDropdown.value;
		}
		updateTemplateDropdown();
	});

	insertTemplateBtn?.addEventListener('mousedown', (e) => {
		e.preventDefault();
		restoreEditorSelection({ forceEndIfUnknown: false });
	});

	insertTemplateBtn?.addEventListener('click', () => {
		if (!templateDropdown?.value) return;
		restoreEditorSelection({ forceEndIfUnknown: false });
		insertTemplate(templateDropdown.value);
	});

	const debouncedUpdateTemplateDropdown = debounce(updateTemplateDropdown, 100);
	editor.addEventListener('input', () => debouncedUpdateTemplateDropdown());

	updateTemplateDropdown();

	const templateVarInputs = [
		'usernameInput', 'projectNameInput',
		'ticketNumberInput', 'prTitleInput', 'apiUrlInput', 'contactEmailInput',
		'projectDescInput', 'licenseTypeInput', 'buildStatusInput', 'buildVersionInput', 'dateInput'
	];

	templateVarInputs.forEach(inputId => {
		const input = document.getElementById(inputId);
		if (input) {
			input.addEventListener('input', () => {
				const templateVars = {};
				templateVarInputs.forEach(id => {
					const el = document.getElementById(id);
					if (el && el.value) {
						templateVars[id] = el.value;
					}
				});
				localStorage.setItem('templateVariables', JSON.stringify(templateVars));
			});
		}
	});

		const dateInput = document.getElementById('dateInput');
	if (dateInput && !dateInput.value) {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		dateInput.value = `${year}-${month}-${day}`;
	}

		previewToggle.addEventListener('click', togglePreview);
	
		formatButtons.forEach(btn => {
		btn.addEventListener('mousedown', (e) => {
			e.preventDefault();
			restoreEditorSelection({ forceEndIfUnknown: false });
		});
		btn.addEventListener('click', () => {
			const format = btn.dataset.format;
			if (!format) return;
			restoreEditorSelection({ forceEndIfUnknown: false });
			formattingController?.applyFormatting(format);
		});
	});

		validateBtn.addEventListener('click', validateMarkdown);
	
		undoActionBtn.addEventListener('click', undoAction);
	
		clearAllBtn.addEventListener('click', clearAll);
	
		prettifyBtn.addEventListener('click', () => formattingController?.prettifyMarkdown());
	
		exportBtn.addEventListener('click', () => filesController?.exportMarkdown());
	
		undoBtn.addEventListener('click', () => formattingController?.undoPrettify());
	
		document.addEventListener('keydown', handleKeyboardShortcuts);
	
		closeShortcuts.addEventListener('click', () => {
			shortcutsModal.classList.remove('show');
		});
	
		shortcutsHint?.addEventListener('click', () => {
			shortcutsModal.classList.toggle('show');
		});
	
		shortcutsModal.addEventListener('click', (e) => {
			if (e.target === shortcutsModal) {
				shortcutsModal.classList.remove('show');
			}
		});
	
		findPrevBtn.addEventListener('click', () => findReplaceController?.findPrev());
		findNextBtn.addEventListener('click', () => findReplaceController?.findNext());
		replaceBtn.addEventListener('click', () => findReplaceController?.replaceCurrent());
		replaceAllBtn.addEventListener('click', () => findReplaceController?.replaceAll());
		closeFindReplace.addEventListener('click', () => findReplaceController?.clear());
	
		lintBtn?.addEventListener('click', () => runLint());
	[
		lintMD001,
		lintMD013,
		lintMD022,
		lintMD041,
		lintMD047,
		lintLineLength
	].forEach((el) => el?.addEventListener('change', () => {
		saveLintSettings();
		if (lintState.lastIssues.length) runLint();
		updateLineNumbers();
	}));

}

const AUTOSAVE_DELAY = 1000;
const HISTORY_DELAY = 3000;

const debounce = window.Utils?.debounce || ((fn) => fn);
const debouncedAutoSave = debounce(() => {
	if (persistenceController) {
		persistenceController.saveContent();
	}
	updateSaveIndicator('saved');
}, AUTOSAVE_DELAY);
const debouncedHistorySave = debounce(() => saveToHistory(), HISTORY_DELAY);
const debouncedLintRun = debounce(() => runLint(), 500);

function handleEditorInput() {
	editorState.content = editor.value;

	previewController?.updatePreview();

	updateSaveIndicator('saving');
	debouncedAutoSave();

	debouncedHistorySave();

	updateLineNumbers();
	if (lintState.lastIssues.length) {
		debouncedLintRun();
	}
}

function getSectionPatterns() {
	return {
		badges: [/!\[.*?\]\(https:\/\/img\.shields\.io/i, /badge/i, /build.*status/i, /coverage/i],
		description: [/^##?\s*(description|about|overview)/i, /^##?\s*what is/i],
		quickstart: [/^##?\s*(quick start|quickstart|getting started)/i],
		prerequisites: [/^##?\s*(prerequisites|requirements|dependencies)/i],
		installation: [/^##?\s*(installation|install|setup)/i],
		configuration: [/^##?\s*(configuration|config|environment)/i, /\.env/i],
		usage: [/^##?\s*(usage|how to use|examples)/i],
		testing: [/^##?\s*(test|testing)/i, /npm test/i, /jest/i, /mocha/i],
		api: [/^##?\s*(api|endpoints|reference)/i],
		troubleshooting: [/^##?\s*(troubleshoot|faq|common issues)/i],
		deployment: [/^##?\s*(deploy|deployment|production)/i],
		contributing: [/^##?\s*(contribut)/i],
		security: [/^##?\s*(security|vulnerab)/i],
		license: [/^##?\s*(license)/i, /^## license/i, /mit license/i, /apache/i],
		changelog: [/^##?\s*(changelog|releases|history)/i, /^## changelog/i],
		quickPR: [/^#\s*pr:/i, /^##?\s*(technical changes)/i, /key changes/i]
	};
}

function analyzeDocument() {
	const content = editor.value.toLowerCase();
	const lines = editor.value.split('\n');
	const sectionPatterns = getSectionPatterns();
	const foundSections = {};

	for (const [section, patterns] of Object.entries(sectionPatterns)) {
		foundSections[section] = false;

		for (const pattern of patterns) {
			if (pattern.test(content)) {
				foundSections[section] = true;
				break;
			}

			for (const line of lines) {
				if (pattern.test(line)) {
					foundSections[section] = true;
					break;
				}
			}
			if (foundSections[section]) break;
		}
	}

	return foundSections;
}

function getSectionOccurrences(lines) {
	const sectionPatterns = getSectionPatterns();
	const occurrences = {};
	for (const section of Object.keys(sectionPatterns)) {
		occurrences[section] = [];
	}
	lines.forEach((line, index) => {
		for (const [section, patterns] of Object.entries(sectionPatterns)) {
			for (const pattern of patterns) {
				if (pattern.test(line)) {
					occurrences[section].push(index);
					break;
				}
			}
		}
	});
	return occurrences;
}

function charPosAtLineStart(lines, lineIndex) {
	if (lineIndex <= 0) return 0;
	return lines.slice(0, lineIndex).join('\n').length + 1;
}

function findInsertionPoint(templateName) {
	const content = editor.value;
	const lines = content.split('\n');
	const templateIndex = templateOrder.indexOf(templateName);

	if (templateIndex === -1) {
		return content.length;
	}

	const occurrences = getSectionOccurrences(lines);

	let lastBeforeLine = null;
	for (let i = 0; i < templateIndex; i++) {
		const section = templateOrder[i];
		const sectionOccurrences = occurrences[section];
		if (sectionOccurrences && sectionOccurrences.length > 0) {
			const lastOccurrence = sectionOccurrences[sectionOccurrences.length - 1];
			if (lastBeforeLine === null || lastOccurrence > lastBeforeLine) {
				lastBeforeLine = lastOccurrence;
			}
		}
	}

	let firstAfterLine = null;
	for (let i = templateIndex + 1; i < templateOrder.length; i++) {
		const section = templateOrder[i];
		const sectionOccurrences = occurrences[section];
		if (sectionOccurrences && sectionOccurrences.length > 0) {
			const firstOccurrence = sectionOccurrences[0];
			if (firstAfterLine === null || firstOccurrence < firstAfterLine) {
				firstAfterLine = firstOccurrence;
			}
		}
	}

	if (lastBeforeLine !== null) {
		const afterPos = (lastBeforeLine + 1 < lines.length)
			? charPosAtLineStart(lines, lastBeforeLine + 1)
			: content.length;

		if (firstAfterLine !== null) {
			const beforePos = charPosAtLineStart(lines, firstAfterLine);
			return Math.min(afterPos, beforePos);
		}
		return afterPos;
	}

	if (firstAfterLine !== null) {
		return charPosAtLineStart(lines, firstAfterLine);
	}

	return content.length;
}

async function insertTemplate(templateName) {
	const template = sections[templateName];
	if (!template) return;

	saveToHistory();

	const currentContent = editor.value;
	const processedTemplate = await processTemplateVariables(template, templateName);

	const { start: storedStart, end: storedEnd, isKnown } = getEditorSelectionRange();

	let start = storedStart;
	let end = storedEnd;

	if (!isKnown && currentContent.trim().length > 0) {
		start = end = findInsertionPoint(templateName);
	}

	start = Math.max(0, Math.min(start, currentContent.length));
	end = Math.max(0, Math.min(end, currentContent.length));

	let prefix = '';
	let suffix = '';

	if (start > 0 && currentContent[start - 1] !== '\n') {
		prefix = '\n\n';
	}
	if (end < currentContent.length && currentContent[end] !== '\n') {
		suffix = '\n\n';
	}

	editor.value = currentContent.substring(0, start) +
		prefix +
		processedTemplate +
		suffix +
		currentContent.substring(end);

	const newCursorPos = start + prefix.length;
	editor.setSelectionRange(newCursorPos, newCursorPos);
	editorState.cursor = { start: newCursorPos, end: newCursorPos, isKnown: true };
	editor.focus();

	handleEditorInput();
	updateTemplateDropdown();

	if (templateDropdown) templateDropdown.value = '';
	if (insertTemplateBtn) insertTemplateBtn.disabled = true;

	setTimeout(() => updateTemplateDropdown(), 50);
	saveToHistory();
}

async function processTemplateVariables(template, sectionName) {
	const templateVars = {
		username: document.getElementById('usernameInput')?.value || 'username',
		projectName: document.getElementById('projectNameInput')?.value || 'project-name',
		ticketNumber: document.getElementById('ticketNumberInput')?.value || '00000',
		prTitle: document.getElementById('prTitleInput')?.value || '[Title]',
		apiUrl: document.getElementById('apiUrlInput')?.value || 'https://api.example.com/v1',
		contactEmail: document.getElementById('contactEmailInput')?.value || 'contact@example.com',
		projectDesc: document.getElementById('projectDescInput')?.value || 'A clear and concise description of what this project does and who it\'s for.',
		licenseType: document.getElementById('licenseTypeInput')?.value || 'MIT',
		buildStatus: document.getElementById('buildStatusInput')?.value || 'passing',
		buildVersion: document.getElementById('buildVersionInput')?.value || '1.0.0',
		date: document.getElementById('dateInput')?.value || new Date().toISOString().split('T')[0]
	};

	let result = template;
	Object.keys(templateVars).forEach(key => {
		const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		result = result.replace(placeholder, templateVars[key]);
	});

	return result;
}

let undoHistory = [];
let redoHistory = [];
const MAX_HISTORY = 50;

function saveToHistory() {
	const currentContent = editor.value;

	if (undoHistory.length > 0 && undoHistory[undoHistory.length - 1] === currentContent) {
		return;
	}

	undoHistory.push(currentContent);
	if (undoHistory.length > MAX_HISTORY) {
		undoHistory.shift();
	}
	redoHistory = [];
}

function undoAction() {
	if (undoHistory.length <= 1) {
		showToast('Nothing to undo', 2000);
		return;
	}

	const currentState = undoHistory.pop();

	const previousState = undoHistory[undoHistory.length - 1];

	redoHistory.push(currentState);
	editor.value = previousState;
	handleEditorInput();
}

async function clearAll() {
	if (!editor.value.trim()) {
		return;
	}

	const confirmed = await showModal({
		title: 'Clear All Content',
		message: 'Are you sure you want to clear all content? This cannot be undone.',
		type: 'warning',
		confirmText: 'Clear All',
		showCancel: true,
		danger: true
	});

	if (confirmed) {
		saveToHistory();
		editor.value = '';
		handleEditorInput();
	}
}

function validateMarkdown() {
	const content = editor.value;
	if (!content.trim()) {
		showModal({
			title: 'Nothing to Validate',
			message: 'Please write some markdown first.',
			type: 'info'
		});
		return;
	}

	const issues = window.Validation?.validateMarkdownContent
		? window.Validation.validateMarkdownContent(content)
		: [];
	if (issues.length === 0) {
		showModal({
			title: 'Markdown Looks Good',
			message: 'No common markdown formatting issues detected.',
			type: 'success',
			confirmText: 'Close'
		});
		return;
	}

	const listItems = issues.map(issue => {
		const lineInfo = issue.line ? `<strong>Line ${issue.line}:</strong> ` : '';
		return `<li>${lineInfo}${issue.message}</li>`;
	}).join('');

	showModal({
		title: 'Markdown Validation',
		message: `<p>Found ${issues.length} issue${issues.length > 1 ? 's' : ''}. Review the details below:</p><ul class="validation-list">${listItems}</ul>`,
		type: 'warning',
		confirmText: 'Close'
	});
}

function toggleSidebar() {
	if (window.innerWidth <= 768) {
		sidebar.classList.toggle('show');
		editorState.sidebarCollapsed = !sidebar.classList.contains('show');
		localStorage.setItem('sidebarCollapsed', editorState.sidebarCollapsed);
	}
}

function togglePreview() {
	editorState.previewVisible = !editorState.previewVisible;
	previewPane.classList.toggle('show');
}

function updateSaveIndicator(state) {
	if (state === 'saving') {
		saveIndicator.classList.add('saving');
		saveIndicator.querySelector('.save-text').textContent = 'Saving...';
	} else {
		saveIndicator.classList.remove('saving');
		saveIndicator.querySelector('.save-text').textContent = 'Saved';
	}
}

function handleKeyboardShortcuts(e) {
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		persistenceController?.saveContent();
		updateSaveIndicator('saved');
		return;
	}

	if (e.ctrlKey && e.key === 'e') {
		e.preventDefault();
		filesController?.exportMarkdown();
		return;
	}

	if (e.ctrlKey && e.shiftKey && e.key === 'F') {
		e.preventDefault();
		formattingController?.prettifyMarkdown();
		return;
	}

	if (e.ctrlKey && e.key === 'z' && editorState.prettifySnapshot) {
		e.preventDefault();
		formattingController?.undoPrettify();
		return;
	}

	if (e.ctrlKey && e.key === '/') {
		e.preventDefault();
		shortcutsModal.classList.toggle('show');
		return;
	}

	if (e.ctrlKey && e.key === 'h') {
		e.preventDefault();
		findReplaceController?.open();
		return;
	}
}

window.addEventListener('DOMContentLoaded', init);
