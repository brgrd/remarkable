(function () {
	function escapeRegex(text) {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function escapeHtml(text) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function createFindReplace({
		editor,
		findInput,
		replaceInput,
		caseSensitive,
		wholeWord,
		regexMode,
		selectionOnly,
		resultsEl,
		panelEl,
		highlightsEl,
		getSelectionRange
	}) {
		let matches = [];
		let currentIndex = -1;
		let selectionAnchor = null;
		let isProgrammaticSelection = false;

		function setResults(html, variant) {
			if (!resultsEl) return;
			resultsEl.innerHTML = html || '';
			resultsEl.className = `find-replace-results${variant ? ` ${variant}` : ''}`;
			if (html) resultsEl.classList.add('visible');
			else resultsEl.classList.remove('visible');
		}

		function clearSelection() {
			if (!editor) return;
			if (editor.selectionStart !== editor.selectionEnd) {
				editor.setSelectionRange(editor.selectionStart, editor.selectionStart);
			}
		}

		function readSelectionRange() {
			if (!editor) return { start: 0, end: 0 };
			const selection = getSelectionRange?.() || {
				start: editor.selectionStart || 0,
				end: editor.selectionEnd || 0
			};
			return { start: selection.start || 0, end: selection.end || 0 };
		}

		function getScope() {
			if (!editor) return { content: '', offset: 0 };
			if (!selectionOnly?.checked) return { content: editor.value, offset: 0 };

			if (!selectionAnchor) {
				const selection = readSelectionRange();
				if (selection.end > selection.start) {
					selectionAnchor = { start: selection.start, end: selection.end };
				}
			}

			if (selectionAnchor && selectionAnchor.end > selectionAnchor.start) {
				return {
					content: editor.value.substring(selectionAnchor.start, selectionAnchor.end),
					offset: selectionAnchor.start
				};
			}
			return { content: editor.value, offset: 0 };
		}

		function buildRegex(searchText, { global = true } = {}) {
			const flagsBase = caseSensitive?.checked ? '' : 'i';
			const flags = global ? `g${flagsBase}` : flagsBase;

			if (regexMode?.checked) return new RegExp(searchText, flags);

			let pattern = escapeRegex(searchText);
			if (wholeWord?.checked) pattern = `\\b${pattern}\\b`;
			return new RegExp(pattern, flags);
		}

		function updateResults(searchText) {
			if (!resultsEl) return;
			if (!editor || !searchText) {
				setResults('', '');
				return;
			}

			let singleRegex;
			try {
				singleRegex = buildRegex(searchText, { global: false });
			} catch {
				setResults('', '');
				return;
			}

			const replaceText = replaceInput?.value ?? '';
			if (!replaceText) {
				if (!matches.length) return;
				const extra = selectionOnly?.checked ? ' (in selection)' : '';
				setResults(`<strong>${matches.length}</strong> match${matches.length === 1 ? '' : 'es'}${extra}`, 'success');
				return;
			}

			const contextRadius = 18;
			const samples = matches.slice(0, 4).map((match) => {
				const before = editor.value.substring(Math.max(0, match.index - contextRadius), match.index);
				const matchText = editor.value.substring(match.index, match.index + match.length);
				const after = editor.value.substring(match.index + match.length, match.index + match.length + contextRadius);
				const replaced = matchText.replace(singleRegex, replaceText);
				return `<div>${escapeHtml(before)}<strong>${escapeHtml(matchText)}</strong>${escapeHtml(after)} → <strong>${escapeHtml(replaced)}</strong></div>`;
			}).join('');

			const suffix = matches.length > 4 ? `<div>…and ${matches.length - 4} more</div>` : '';
			setResults(`<div><strong>${matches.length}</strong> replacement${matches.length === 1 ? '' : 's'}</div>${samples}${suffix}`, 'success');
		}

		function updateHighlights(searchText) {
			if (!highlightsEl) return;
			if (!editor || !searchText || matches.length === 0) {
				highlightsEl.innerHTML = '';
				return;
			}

			let html = '';
			let cursor = 0;
			const content = editor.value;

			for (let i = 0; i < matches.length; i++) {
				const match = matches[i];
				if (match.index < cursor) continue;
				html += escapeHtml(content.substring(cursor, match.index));
				const cls = i === currentIndex ? 'current' : '';
				html += `<mark class="${cls}">${escapeHtml(content.substring(match.index, match.index + match.length))}</mark>`;
				cursor = match.index + match.length;
			}

			html += escapeHtml(content.substring(cursor));
			highlightsEl.innerHTML = html;
			highlightsEl.scrollTop = editor.scrollTop;
			highlightsEl.scrollLeft = editor.scrollLeft;
		}

		function syncHighlightsScroll() {
			if (!highlightsEl || !editor) return;
			highlightsEl.scrollTop = editor.scrollTop;
			highlightsEl.scrollLeft = editor.scrollLeft;
		}

		function refreshMatches(searchText) {
			matches = [];
			currentIndex = -1;

			if (!editor || !searchText) {
				setResults('', '');
				updateHighlights(searchText);
				updateResults(searchText);
				return;
			}

			const { content, offset } = getScope();
			let regex;
			try {
				regex = buildRegex(searchText, { global: true });
			} catch {
				setResults('Invalid regex pattern', 'error');
				updateHighlights(searchText);
				updateResults(searchText);
				return;
			}

			let match;
			while ((match = regex.exec(content)) !== null) {
				if (match[0].length === 0) {
					regex.lastIndex += 1;
					continue;
				}
				matches.push({ index: offset + match.index, length: match[0].length });
			}

			if (matches.length === 0) {
				setResults('No matches found', 'error');
			} else {
				updateResults(searchText);
			}

			updateHighlights(searchText);
			updateResults(searchText);
		}

		function selectMatch(index) {
			if (!editor || index < 0 || index >= matches.length) return;
			const match = matches[index];
			editor.focus();
			isProgrammaticSelection = true;
			editor.setSelectionRange(match.index, match.index + match.length);
			setTimeout(() => { isProgrammaticSelection = false; }, 0);
			editor.scrollTop = editor.scrollHeight * (match.index / editor.value.length);
			setResults(`Match <strong>${index + 1}</strong> of <strong>${matches.length}</strong>`, 'success');
			updateHighlights(findInput?.value ?? '');
		}

		function find(direction = 'next') {
			const searchText = findInput?.value ?? '';
			if (!searchText) {
				setResults('Enter text to find', 'error');
				return;
			}

			refreshMatches(searchText);
			if (matches.length === 0) return;

			if (direction === 'next') {
				currentIndex = (currentIndex + 1) % matches.length;
			} else {
				currentIndex = currentIndex <= 0 ? matches.length - 1 : currentIndex - 1;
			}

			selectMatch(currentIndex);
		}

		function replaceCurrent() {
			if (!editor) return;
			if (currentIndex < 0 || currentIndex >= matches.length) {
				setResults('No match selected', 'error');
				return;
			}

			const searchText = findInput?.value ?? '';
			const replaceText = replaceInput?.value ?? '';
			const match = matches[currentIndex];
			const content = editor.value;
			const matchText = content.substring(match.index, match.index + match.length);

			let replacement = replaceText;
			if (regexMode?.checked && searchText) {
				try {
					const singleRegex = buildRegex(searchText, { global: false });
					replacement = matchText.replace(singleRegex, replaceText);
				} catch {
					setResults('Invalid regex pattern', 'error');
					return;
				}
			}

			editor.value = content.substring(0, match.index) +
				replacement +
				content.substring(match.index + match.length);

			refreshMatches(searchText);
			if (matches.length === 0) {
				setResults('All matches replaced', 'success');
				clearSelection();
				return;
			}

			currentIndex = Math.min(currentIndex, matches.length - 1);
			selectMatch(currentIndex);
		}

		function replaceAll() {
			if (!editor) return;
			const searchText = findInput?.value ?? '';
			const replaceText = replaceInput?.value ?? '';

			if (!searchText) {
				setResults('Enter text to find', 'error');
				return;
			}

			let regex;
			try {
				regex = buildRegex(searchText, { global: true });
			} catch {
				setResults('Invalid regex pattern', 'error');
				return;
			}

			const scope = getScope();
			const matchesFound = scope.content.match(regex);
			if (!matchesFound || matchesFound.length === 0) {
				setResults('No matches found', 'error');
				return;
			}

			if (scope.offset === 0 && scope.content.length === editor.value.length) {
				editor.value = editor.value.replace(regex, replaceText);
			} else {
				const before = editor.value.substring(0, scope.offset);
				const after = editor.value.substring(scope.offset + scope.content.length);
				const replaced = scope.content.replace(regex, replaceText);
				editor.value = before + replaced + after;
				if (selectionOnly?.checked && selectionAnchor) {
					selectionAnchor = { start: scope.offset, end: scope.offset + replaced.length };
				}
			}

			setResults(`Replaced <strong>${matchesFound.length}</strong> occurrence${matchesFound.length > 1 ? 's' : ''}`, 'success');
			refreshMatches(searchText);
			clearSelection();
		}

		function open() {
			setResults('', '');
			matches = [];
			currentIndex = -1;
			if (panelEl) panelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setTimeout(() => findInput?.focus(), 50);
		}

		function clear() {
			if (findInput) findInput.value = '';
			if (replaceInput) replaceInput.value = '';
			setResults('', '');
			matches = [];
			currentIndex = -1;
			selectionAnchor = null;
			clearSelection();
			updateHighlights('');
			updateResults('');
		}

		function attachListeners() {
			findInput?.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') find('next');
			});
			replaceInput?.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') replaceCurrent();
			});

			const refresh = () => refreshMatches(findInput?.value ?? '');
			findInput?.addEventListener('input', refresh);
			replaceInput?.addEventListener('input', refresh);
			caseSensitive?.addEventListener('change', refresh);
			wholeWord?.addEventListener('change', refresh);

			regexMode?.addEventListener('change', () => {
				if (regexMode.checked) {
					if (wholeWord) {
						wholeWord.checked = false;
						wholeWord.disabled = true;
					}
				} else if (wholeWord) {
					wholeWord.disabled = false;
				}
				refresh();
			});

			selectionOnly?.addEventListener('change', () => {
				selectionAnchor = selectionOnly.checked ? readSelectionRange() : null;
				if (selectionAnchor && selectionAnchor.end <= selectionAnchor.start) selectionAnchor = null;
				refresh();
			});

			editor?.addEventListener('input', refresh);
			editor?.addEventListener('scroll', syncHighlightsScroll);
			editor?.addEventListener('mouseup', () => {
				if (!selectionOnly?.checked || isProgrammaticSelection) return;
				const selection = readSelectionRange();
				if (selection.end > selection.start) selectionAnchor = selection;
			});
			editor?.addEventListener('keyup', () => {
				if (!selectionOnly?.checked || isProgrammaticSelection) return;
				const selection = readSelectionRange();
				if (selection.end > selection.start) selectionAnchor = selection;
			});
		}

		attachListeners();

		return {
			open,
			clear,
			findNext: () => find('next'),
			findPrev: () => find('prev'),
			replaceCurrent,
			replaceAll
		};
	}

	window.FindReplace = { createFindReplace };
})();
