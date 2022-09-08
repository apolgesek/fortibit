on run argv
    set theString to item 1 of argv
    tell application "System Events"
        repeat with thisChar in theString
            keystroke thisChar
            delay 0.05
        end repeat
    end tell
end run