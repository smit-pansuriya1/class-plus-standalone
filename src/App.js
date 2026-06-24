import { LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import MeetingRoom from "./components/MeetingRoom";
import { MEETING_ID, TOKEN } from "./config";
import { MODES } from "./constants";

// How a student watches the class before being promoted.
const joinTypes = {
  hls: "hls", // SIGNALLING_ONLY — watch the (delayed) HLS broadcast
  zeroLag: "zero-lag", // RECV_ONLY — watch the tutor's live WebRTC (low latency)
};

// A tutor's display name always starts with "Tutor ".
function normalizeDisplayName(name, role) {
  const trimmed = name.trim();

  if (role === "tutor" && !trimmed.toLowerCase().startsWith("tutor")) {
    return `Tutor ${trimmed}`;
  }

  return trimmed;
}

// Participant id format: <5 digits>_<roleCode> (3 = tutor, 1 = student).
const ROLE_CODES = { tutor: "3", student: "1" };

function createParticipantId(role) {
  const fiveDigits = Math.floor(10000 + Math.random() * 90000);
  const roleCode = ROLE_CODES[role] || ROLE_CODES.student;

  return `${fiveDigits}_${roleCode}`;
}

export default function App() {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("student");
  const [studentJoinType, setStudentJoinType] = useState(joinTypes.hls);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  const audienceMode =
    role === "tutor"
      ? MODES.SEND_AND_RECV
      : studentJoinType === joinTypes.zeroLag
      ? MODES.RECV_ONLY
      : MODES.SIGNALLING_ONLY;

  const meetingDisplayName = useMemo(
    () => normalizeDisplayName(displayName, role),
    [displayName, role]
  );
  const participantId = useMemo(() => createParticipantId(role), [role]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Enter a display name.");
      return;
    }

    setError("");
    setJoined(true);
  };

  if (joined) {
    return (
      <MeetingRoom
        roomId={MEETING_ID}
        token={TOKEN}
        displayName={meetingDisplayName}
        participantId={participantId}
        role={role}
        audienceMode={audienceMode}
        onMeetingEnd={() => setJoined(false)}
      />
    );
  }

  return (
    <main className="lobby-shell">
      <section className="lobby-panel" aria-labelledby="meeting-title">
        <div className="lobby-heading">
          <span className="brand-mark" aria-hidden="true">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h1 id="meeting-title">ClassPlus</h1>
            <p>Live class room</p>
          </div>
        </div>

        <form className="lobby-form" onSubmit={handleSubmit}>
          <label>
            <span>{role === "tutor" ? "Tutor name" : "Student name"}</span>
            <div className="input-with-icon gap">
              <UserRound size={18} aria-hidden="true" />
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={role === "tutor" ? "John" : "Ava Patel"}
                autoComplete="name"
              />
            </div>
            {displayName.trim() && role === "tutor" ? (
              <small className="field-hint">Joining as {meetingDisplayName}</small>
            ) : null}
          </label>

          <fieldset className="role-fieldset">
            <legend>Role</legend>
            <div className="role-options">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={(event) => setRole(event.target.value)}
                />
                Student
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="tutor"
                  checked={role === "tutor"}
                  onChange={(event) => setRole(event.target.value)}
                />
                Tutor
              </label>
            </div>
          </fieldset>

          {role === "student" ? (
            <fieldset className="role-fieldset">
              <legend>Watch mode</legend>
              <div className="role-options">
                <label>
                  <input
                    type="radio"
                    name="joinType"
                    value={joinTypes.hls}
                    checked={studentJoinType === joinTypes.hls}
                    onChange={(event) => setStudentJoinType(event.target.value)}
                  />
                  Join as HLS
                </label>
                <label>
                  <input
                    type="radio"
                    name="joinType"
                    value={joinTypes.zeroLag}
                    checked={studentJoinType === joinTypes.zeroLag}
                    onChange={(event) => setStudentJoinType(event.target.value)}
                  />
                  Join as zero lag
                </label>
              </div>
            </fieldset>
          ) : null}

          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <button className="primary-action" type="submit">
            <LogIn size={18} />
            Join class
          </button>
        </form>
      </section>
    </main>
  );
}
