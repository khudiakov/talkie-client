import React from "react";
import Peer from "peerjs";

import "./App.css";

const peer = new Peer({
  host: "khudiakov.monster",
  port: "9000",
  path: "/",
  secure: true
});

const SERVER = "https://6aab9a53.ngrok.io";
const getTags = (() => {
  let tags = null;
  return async () => {
    if (tags) {
      return tags;
    }

    const response = await fetch(`${SERVER}/get-tags`);
    const data = await response.json();
    tags = data.tags;
    return tags;
  };
})();
const getParty = async ({ id, tags }) => {
  const response = await fetch(`${SERVER}/get-user-by-tags`, {
    method: "POST",
    body: JSON.stringify({ username: id, tags }),
    headers: { "Content-Type": "application/json" }
  });

  const { username } = await response.json();
  return { partyId: username };
};


const getStream = (() => {
  let stream = null;

  return async () => {
    if (stream) {
      return stream;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
    } catch (e) {
      console.error(e);
    }

    return stream;
  };
})();

const startCall = async ({ id, stream }) => {
  const connection = peer.connect(id);
  const callStream = await new Promise(resolve => {
    const call = peer.call(id, stream);
    call.on("stream", callStream => resolve(callStream));
  });

  return { callStream, connection };
};

function App() {
  const [id, setId] = React.useState(null);
  const [tags, setTags] = React.useState([]);
  const [selectedTags, setSelectedTags] = React.useState([]);

  const streamRef = React.useRef(null);
  const callStreamRef = React.useRef(null);

  const [loading, setLoading] = React.useState(false);

  const [connection, setConnection] = React.useState(null);
  const [stream, setStream] = React.useState(null);
  const [callStream, setCallStream] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const stream = await getStream();
      setStream(stream);
    })();
    (async () => {
      const tags = await getTags();
      setTags(tags);
    })();

    peer.on("open", id => setId(id));
    peer.on("call", async call => {
      const stream = await getStream();
      call.answer(stream);
      const callStream = await new Promise(resolve =>
        call.on("stream", callStream => resolve(callStream))
      );

      setCallStream(callStream);
    });
    peer.on("connection", async conn => {
      setConnection(conn);
    });
  }, []);

  React.useEffect(() => {
    if (!connection) {
      return;
    }

    connection.on("data", data => {
      const { type } = JSON.parse(data);
      if (type === "STOP") {
        setCallStream(prevCallStream => {
          prevCallStream.getTracks().forEach(track => track.stop());
          return null;
        });
        setConnection(null);
      }
    });
  }, [connection]);

  React.useEffect(() => {
    streamRef.current.srcObject = stream;
    callStreamRef.current.srcObject = callStream;
  }, [stream, callStream]);

  React.useEffect(() => {
    streamRef.current.onloadedmetadata = () => {
      streamRef.current.play();
    };
    callStreamRef.current.onloadedmetadata = () => {
      callStreamRef.current.play();
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {!callStream ? (
        <div style={{ display: "flex", flexDirection: "row" }}>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);

              const { partyId } = await getParty({ id, tags: selectedTags });
              if (!partyId) {
                setLoading(false);
                return;
              }

              const call = await startCall({ id: partyId, stream });
              if (!call) {
                setLoading(false);
                return;
              }

              setConnection(call.connection);
              setCallStream(call.callStream);
              setLoading(false);
            }}
          >
            Connect
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            connection.send(JSON.stringify({ type: "STOP" }));
            setConnection(null);
            setCallStream(prevCallStream =>
              prevCallStream.getTracks().forEach(track => track.stop())
            );
          }}
        >
          Stop
        </button>
      )}
      {tags && (
        <div style={{ display: "flex", flexDirection: "row" }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                color: selectedTags.includes(tag) ? "red" : "black",
                marginRight: 5
              }}
              onClick={() =>
                setSelectedTags(sT =>
                  sT.includes(tag) ? sT.filter(t => tag !== t) : sT.concat(tag)
                )
              }
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <video ref={callStreamRef} id="callStream" style={{ flex: 1 }} />
      <video
        ref={streamRef}
        id="stream"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 200,
          height: 100
        }}
      />
    </div>
  );
}

export default App;
