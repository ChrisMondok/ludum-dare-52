export const audioContext = new AudioContext();

export type SoundName = keyof typeof sounds;

const masterGain = audioContext.createGain();
masterGain.connect(audioContext.destination);


export function setVolume(volume: number) {
  masterGain.gain.value = volume;
}

const sounds = {
  bigouch:'./sounds/bigouch.wav',
  block: './sounds/block.wav',
  destroy:'./sounds/destroy.wav',
  jump:'./sounds/jump.wav',
  melee: './sounds/melee.wav',
  newleaf: './sounds/newleaf.wav',
  ouch:'./sounds/ouch.wav',
  pickup:'./sounds/pickup.wav',
  plant: './sounds/plant.wav',
  playerjump: './sounds/playerjump.wav',
  playerspawn: './sounds/playerspawn.wav',
  shoot:'./sounds/shoot.wav',
  spawn: './sounds/spawn.wav',
};

export function playSoundAt(sound: SoundName, x: number, y = 0, z = -1) {
  const buffer = loadedSounds.get(sound);
  if(!buffer) {
    console.log(`Attempted to play ${sound} before it was loaded`);
    return;
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const panner = audioContext.createPanner();
  if(panner.positionX) {
    panner.positionX.setValueAtTime(x, audioContext.currentTime);
    panner.positionY.setValueAtTime(y, audioContext.currentTime);
    panner.positionZ.setValueAtTime(z, audioContext.currentTime);
  } else {
    panner.setPosition(x, y, z);
  }
  
  source.connect(panner);
  panner.connect(masterGain);
  source.start(audioContext.currentTime);
}

export function playSound(sound: SoundName) {
  const buffer = loadedSounds.get(sound);
  if(!buffer) {
    console.log(`Attempted to play ${sound} before it was loaded`);
    return;
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(masterGain);
  source.start(audioContext.currentTime);
}

const loadedSounds = new Map<SoundName, AudioBuffer>();

for(const [name, path] of Object.entries(sounds)) {
  loadSound(path).then(b => loadedSounds.set(name as SoundName, b));
}

async function loadSound(path: string) {
  const response = await fetch(path);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}
