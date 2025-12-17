(function () {
	function createPersistence({
		editor,
		sidebar,
		editorState,
		saveToHistory,
		showModal
	}) {
		function saveContent() {
			if (!editor) return;
			try {
				localStorage.setItem('markdown-content', editor.value);
				localStorage.setItem('markdown-timestamp', Date.now());
			} catch (e) {
				if (e.name === 'QuotaExceededError') {
					console.error('LocalStorage quota exceeded');
					showModal?.({
						title: 'Storage Full',
						message: 'Storage quota exceeded. Your content may not be saved.',
						type: 'warning'
					});
				}
			}
		}

			function loadContent() {
				if (!editor) return;
				const savedContent = localStorage.getItem('markdown-content');
				if (savedContent) {
					editor.value = savedContent;
					editorState.content = savedContent;
					saveToHistory?.();
				}

			editorState.sidebarCollapsed = false;
			sidebar?.classList.remove('collapsed');
			sidebar?.classList.remove('show');
			localStorage.removeItem('sidebarCollapsed');

				if (window.innerWidth <= 768) {
					sidebar?.classList.remove('show');
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
					console.error('Error loading template variables:', e);
				}
			}

		return { saveContent, loadContent, loadTemplateVariables };
	}

	window.Persistence = { createPersistence };
})();
