import './SearchBar.css';

/**
 * Props for the SearchBar component.
 */
export interface SearchBarProps {
  /** Current search query (controlled value). */
  value: string;
  /** Called with the new query on every keystroke (real-time filtering). */
  onChange: (query: string) => void;
}

/**
 * SearchBar — the search input rendered at the top of the Main View.
 *
 * This is a focused, controlled presentational input. It reports every
 * keystroke through `onChange` so the containing view (MainView, task 12) can
 * filter tracks in real time using the `filterTracks` utility and render the
 * "No se encontraron pistas" empty state when the filtered result is empty.
 *
 * Requirements:
 *   - 7.1 Show a search field at the top of the Main View.
 *   - 7.2 Report text changes in real time on every keystroke so the container
 *         can filter tracks (title/artist substring match).
 *   - 7.3 An empty value maps to "show all tracks" (handled by filterTracks).
 *   - 7.4 Case-insensitive filtering (handled by filterTracks).
 *
 * The remaining search behaviors (7.5 empty-state message, 7.6 setting the
 * queue from filtered results) are wired where SearchBar and PlaylistView are
 * composed, since the filtered list and playback queue live in that container.
 */
function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <label className="search-bar__label" htmlFor="search-bar-input">
        Buscar pistas
      </label>
      <input
        id="search-bar-input"
        className="search-bar__input"
        type="search"
        role="searchbox"
        placeholder="Buscar por título o artista…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

export default SearchBar;
