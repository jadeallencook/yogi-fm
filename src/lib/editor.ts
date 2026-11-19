/**
 * Edit-mode UI (`npm run dev:edit`): edit titles, delete videos, add videos.
 * Loaded only by EditorTools.astro. Talks to the dev-server endpoints in
 * integrations/content-editor.mjs, which rewrite src/environments/*.json.
 *
 * Every edit-mode element carries [data-editor] so player.ts ignores clicks on it.
 */
// ?inline returns the CSS as a string; it's injected below. A plain CSS import would be
// collected into the site stylesheet even in production builds.
import editorCss from '../styles/editor.css?inline';
import { speakers, music } from './data';

/*
 * No page reloads: the dev server skips the browser reload for editor writes (see
 * integrations/content-editor.mjs), so after each change we update the in-memory
 * content (the same module instance player.ts uses) and the DOM, then tell the
 * player to re-render (marquee, active row, etc.).
 */
function collectionFor(node: HTMLElement) {
  const { kind, slug } = listOf(node);
  const all = kind === 'speaker' ? speakers : music;
  return slug && Object.hasOwn(all, slug) ? all[slug] : undefined;
}

function contentChanged() {
  document.dispatchEvent(new CustomEvent('content:changed'));
}

type Route = 'title' | 'delete' | 'add';

async function post(route: Route, payload: Record<string, unknown>) {
  const res = await fetch(`/__editor/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** kind/slug for the list a row or form belongs to. */
function listOf(node: HTMLElement) {
  const list = node.closest<HTMLElement>('[data-collection]');
  return {
    kind: list?.dataset.kind === 'lecture' ? 'speaker' : 'music',
    slug: list?.dataset.collection,
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) {
  return Object.assign(document.createElement(tag), props);
}

// --- Edit title -------------------------------------------------------------

function openEditor(row: HTMLElement) {
  if (row.querySelector('form.edit-title-form')) return;
  const titleEl = row.querySelector<HTMLElement>('[data-title]');
  const actions = row.querySelector<HTMLElement>('.edit-actions');
  if (!titleEl) return;
  const original = titleEl.textContent ?? '';

  const form = el('form', { className: 'edit-title-form' });
  form.dataset.editor = '';
  form.dataset.astroReload = ''; // Keep Astro's ClientRouter from turning submit into a navigation.
  const input = el('input', { value: original, maxLength: 300 });
  input.setAttribute('aria-label', 'Title');
  const save = el('button', { type: 'submit', textContent: 'Save' });
  const cancel = el('button', { type: 'button', textContent: 'Cancel' });
  const error = el('span', { className: 'edit-status' });
  form.append(input, save, cancel, error);

  const close = () => {
    form.remove();
    titleEl.hidden = false;
    actions?.removeAttribute('hidden');
  };

  cancel.addEventListener('click', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title || title === original) return close();
    save.disabled = true;
    save.textContent = 'Saving…';
    error.textContent = '';
    try {
      const body = await post('title', { ...listOf(row), id: row.dataset.play, title });
      titleEl.textContent = body.title;
      const collection = collectionFor(row);
      if (collection) collection.videos[row.dataset.play!] = body.title;
      close();
      contentChanged();
    } catch (err) {
      error.textContent = `Not saved: ${message(err)}`;
      save.disabled = false;
      save.textContent = 'Save';
    }
  });

  titleEl.hidden = true;
  actions?.setAttribute('hidden', '');
  titleEl.after(form);
  input.focus();
  input.select();
}

// --- Delete -----------------------------------------------------------------

/** Two-step delete inside the row: Delete -> "Delete? Yes / No". No browser dialogs. */
function confirmDelete(row: HTMLElement) {
  const actions = row.querySelector<HTMLElement>('.edit-actions');
  if (!actions || actions.querySelector('[data-confirm]')) return;
  const buttons = Array.from(actions.children) as HTMLElement[];
  buttons.forEach((b) => (b.hidden = true));

  const confirm = el('span', { className: 'delete-confirm' });
  confirm.dataset.confirm = '';
  const label = el('span', { textContent: 'Delete?' });
  const yes = el('button', { type: 'button', className: 'danger', textContent: 'Yes, delete' });
  const no = el('button', { type: 'button', textContent: 'No' });
  confirm.append(label, yes, no);
  actions.append(confirm);
  actions.classList.add('confirming');
  no.focus();

  const reset = () => {
    confirm.remove();
    actions.classList.remove('confirming');
    buttons.forEach((b) => (b.hidden = false));
  };
  no.addEventListener('click', reset);
  confirm.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') reset();
  });

  yes.addEventListener('click', async () => {
    yes.disabled = no.disabled = true;
    label.textContent = 'Deleting…';
    try {
      await post('delete', { ...listOf(row), id: row.dataset.play });
      const collection = collectionFor(row);
      const list = row.closest<HTMLElement>('[data-collection]');
      if (collection) delete collection.videos[row.dataset.play!];
      row.remove();
      if (list && !list.querySelector('[data-play]')) (list.querySelector('.rows') ?? list).append(emptyRow(list));
      contentChanged();
    } catch (err) {
      label.textContent = `Not deleted: ${message(err)}`;
      yes.remove();
      no.disabled = false;
      no.textContent = 'OK';
    }
  });
}

// --- Add --------------------------------------------------------------------

/** Same markup as a row in Songs.astro (edit mode). */
/** Same markup as a row in Songs.astro. */
function buildRow(id: string, title: string) {
  const row = el('div', { className: 'song animated fadeIn', tabIndex: 0 });
  row.dataset.play = id;
  row.setAttribute('role', 'button');
  const lead = el('span', { className: 'lead' });
  lead.setAttribute('aria-hidden', 'true');
  const bars = el('span', { className: 'bars' });
  bars.append(el('i'), el('i'), el('i'));
  lead.append(el('span', { className: 'num' }), el('i', { className: 'fa fa-play hover-play' }), bars);
  const titleCell = el('div', { className: 'title' });
  const titleEl = el('span', { textContent: title });
  titleEl.dataset.title = '';
  titleCell.append(titleEl);
  const actions = el('span', { className: 'edit-actions' });
  actions.dataset.editor = '';
  const edit = el('button', { type: 'button', className: 'edit-title', textContent: 'Edit' });
  edit.setAttribute('aria-label', `Edit title: ${title}`);
  const del = el('button', { type: 'button', className: 'delete-video', textContent: 'Delete' });
  del.setAttribute('aria-label', `Delete: ${title}`);
  actions.append(edit, del);
  row.append(lead, titleCell, actions);
  return row;
}

function emptyRow(list: HTMLElement) {
  const row = el('div', { className: 'song empty' });
  row.append(el('div', { textContent: list.dataset.kind === 'lecture' ? 'No lectures yet.' : 'No tracks yet.' }));
  return row;
}

function insertRow(form: HTMLElement, id: string, title: string, top: boolean) {
  const list = form.closest<HTMLElement>('[data-collection]');
  const collection = collectionFor(form);
  if (!list || !collection) return;
  // Key order is display order, same as the server's insert.
  collection.videos = top ? { [id]: title, ...collection.videos } : { ...collection.videos, [id]: title };
  list.querySelector('.song.empty')?.remove();
  const row = buildRow(id, title);
  const rows = list.querySelectorAll('[data-play]');
  if (top && rows.length) rows[0].before(row);
  else if (rows.length) rows[rows.length - 1].after(row);
  else (list.querySelector('.rows') ?? list).append(row);
}

async function addVideo(form: HTMLFormElement) {
  const data = new FormData(form);
  const status = form.querySelector<HTMLElement>('[data-add-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  submit.disabled = true;
  status.className = 'edit-status';
  status.textContent = 'Checking YouTube…';
  try {
    const body = await post('add', {
      ...listOf(form),
      video: data.get('video'),
      title: data.get('title'),
      position: data.get('position'),
    });
    status.classList.add('ok');
    status.textContent = `Added "${body.title}".`;
    insertRow(form, body.id, body.title, data.get('position') === 'top');
    form.reset();
    submit.disabled = false;
    contentChanged();
  } catch (err) {
    status.textContent = `Not added: ${message(err)}`;
    submit.disabled = false;
  }
}

// --- Setup ------------------------------------------------------------------

export function initEditor() {
  // In <body>, not <head>: on client-side navigation Astro's swapHeadElements() removes
  // head elements the next page doesn't list, which dropped these styles (unstyled Edit/
  // Delete buttons until a full reload). Our swap only replaces [data-page] in the body.
  const style = document.createElement('style');
  style.dataset.editorStyles = '';
  style.textContent = editorCss;
  document.body.append(style);

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-play]');
    if (!row) return;
    if (target.closest('button.edit-title')) openEditor(row);
    else if (target.closest('button.delete-video')) confirmDelete(row);
  });

  // Capture phase, so this runs before Astro's ClientRouter submit handler (which would
  // otherwise navigate to ?video=…). The forms also carry data-astro-reload, which the
  // router skips.
  document.addEventListener(
    'submit',
    (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('form[data-add]');
      if (!form) return;
      e.preventDefault();
      addVideo(form);
    },
    true,
  );
}
