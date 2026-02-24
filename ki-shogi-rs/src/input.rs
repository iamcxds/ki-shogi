// Ki Shogi - Keyboard input (crossterm)

use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Key {
    Up, Down, Left, Right,
    Enter, Esc, Tab, Space,
    Q, D, M, L, R,
    One, Two, Three, Four, Five,
}

/// Poll for a key event with the given timeout (milliseconds).
/// Returns None if no event within timeout.
pub fn poll_key(timeout_ms: u64) -> Option<Key> {
    if event::poll(Duration::from_millis(timeout_ms)).unwrap_or(false) {
        if let Ok(Event::Key(KeyEvent { code, modifiers, kind, .. })) = event::read() {
            if kind != KeyEventKind::Press { return None; }
            // Ctrl+C → quit
            if modifiers.contains(KeyModifiers::CONTROL) && code == KeyCode::Char('c') {
                return Some(Key::Q);
            }
            return match code {
                KeyCode::Up    => Some(Key::Up),
                KeyCode::Down  => Some(Key::Down),
                KeyCode::Left  => Some(Key::Left),
                KeyCode::Right => Some(Key::Right),
                KeyCode::Enter => Some(Key::Enter),
                KeyCode::Esc   => Some(Key::Esc),
                KeyCode::Tab   => Some(Key::Tab),
                KeyCode::Char(' ') => Some(Key::Space),
                KeyCode::Char('q') | KeyCode::Char('Q') => Some(Key::Q),
                KeyCode::Char('d') | KeyCode::Char('D') => Some(Key::D),
                KeyCode::Char('m') | KeyCode::Char('M') => Some(Key::M),
                KeyCode::Char('l') | KeyCode::Char('L') => Some(Key::L),
                KeyCode::Char('r') | KeyCode::Char('R') => Some(Key::R),
                KeyCode::Char('1') => Some(Key::One),
                KeyCode::Char('2') => Some(Key::Two),
                KeyCode::Char('3') => Some(Key::Three),
                KeyCode::Char('4') => Some(Key::Four),
                KeyCode::Char('5') => Some(Key::Five),
                _ => None,
            };
        }
    }
    None
}
