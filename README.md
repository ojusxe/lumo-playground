# Stan Playground

Control 3D models using hand gestures and voice commands in real-time.

An interactive web app built with threejs, mediapipe computer vision, web speech API, and rosebud AI. While most applications of computer vision technologies like OpenCV have been through Python bindings, this project demonstrates the power and accessibility of JavaScript bindings for the same advanced computer vision capabilities, bringing real-time hand tracking directly to web browsers without additional installations.

- Say "drag", "rotate", "scale", or "animate" to change the interaction mode
- Pinch fingers to control the 3D model
- Drag/drop a new 3D model onto the page to import it (GLB/GLTF format)

## Requirements

- Modern web browser with WebGL support
- Camera / microphone access

## Technologies

- **Three.js** for 3D rendering
- **MediaPipe** for hand tracking and gesture recognition
- **Web Speech API** for speech recognition
- **HTML5 Canvas** for visual feedback
- **JavaScript** for real-time interaction

## Credits

- Three.js - https://threejs.org/
- MediaPipe - https://mediapipe.dev/
- Rosebud AI - https://rosebud.ai/
- Quaternius 3D models - https://quaternius.com/