# Narration in your own voice

The lesson has 14 narration lines, about 3½ minutes of speaking in all. Each line you record replaces the browser voice for that line. Any line you haven't recorded keeps using the browser voice, so you can record a few at a time.

## Recording

The easiest way is the recording page: open the lesson's link with `#record` on the end (for example `https://your-site.netlify.app/#record`), or open the **Teacher guide** and choose **Record narration**. It shows every line with **Record**, **Play** and **Save file** buttons, and names each file correctly.

Phone voice memos work too. Name each file after its line, as in the table below.

Tips:

- Use a quiet room with soft furnishings. Hold the mic about a hand's width from your mouth.
- Pause for a beat before and after each line.
- Read at classroom pace, a little slower than normal conversation.
- **Read the words exactly as written.** The captions show this text while your voice plays. If you'd rather say something differently, note your wording and the captions will be updated to match.

## The script

### Lesson steps

| Line | File | Words to read |
|---|---|---|
| Step 1: Briefing | `step-briefing.mp3` | Welcome to the reef. Today we are going on an expedition with one big question: What makes this reef a home? Before we look, share your first idea. |
| Step 2: Explore | `step-explore.mp3` | We will visit three places next to each other: a coral reef, a seagrass meadow and a sandy seabed. Look closely and select each animal to learn about it. |
| Step 3: Connect | `step-connect.mp3` | Animals get energy from food. In a food web, the arrow points from the food to the consumer — the one that eats it. Choose the arrow that shows which way energy moves. |
| Step 4: Investigate | `step-investigate.mp3` | Look at the small fish hiding in the coral. What could happen to it if there were fewer places to hide? Make a prediction as a class. Then compare before and after. |
| Step 5: Explain | `step-explain.mp3` | Now it is your turn to explain. Answer three questions about food, shelter and how we can protect this home. |
| Step 6: Recap | `step-recap.mp3` | Let’s look back at our big question: What makes this reef a home? The reef and the habitats around it give organisms food and shelter. |

### Habitat stops

| Line | File | Words to read |
|---|---|---|
| Reef | `habitat-reef.mp3` | Reef. Coral builds the reef. Its branches and holes make spaces animals use. Find the coral, the parrotfish and the barracuda. Look for places a small fish could hide. |
| Seagrass meadow | `habitat-seagrass.mp3` | Seagrass meadow. Next to the reef is a meadow of seagrass. Seagrass is a plant that grows underwater. Find the green sea turtle. What could the seagrass give an animal? |
| Sandy seabed | `habitat-sand.mp3` | Sandy seabed. At the edge of the seagrass, the seafloor opens into sand. Life here can be easy to miss. Look closely. Find the queen conch at the edge of the sand and seagrass. |

### Organism cards

| Line | File | Words to read |
|---|---|---|
| Elkhorn coral | `organism-elkhorn-coral.mp3` | Elkhorn coral. Coral is an animal. Elkhorn coral builds a hard skeleton with wide, flat branches. The spaces between branches give fish places to hide. Look between the branches. What is using those spaces? |
| Stoplight parrotfish | `organism-stoplight-parrotfish.mp3` | Stoplight parrotfish. This parrotfish scrapes algae off rocks and dead coral with its beak-like teeth. Algae is its main food. Watch its mouth. Where does it look for food? |
| Great barracuda | `organism-great-barracuda.mp3` | Great barracuda. The great barracuda is a predator. It hunts by sight and eats mostly other fish. Look at its long body. How might that shape help it move quickly? |
| Green sea turtle | `organism-green-sea-turtle.mp3` | Green sea turtle. Adult green sea turtles eat mostly seagrass and algae. Seagrass meadows are places where they feed. Where does the turtle spend its time? Why might it stay near the seagrass? |
| Queen conch | `organism-queen-conch.mp3` | Queen conch. The queen conch is a large sea snail. It moves slowly along the seafloor, grazing on algae. Look closely at the edge of the sand. What helps the conch blend in? |

## Adding recordings to the lesson

1. Convert each file to MP3 (mono, normalised loudness):

   ```bash
   ffmpeg -i step-briefing.webm -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5" -ac 1 -b:a 96k public/media/narration/step-briefing.mp3
   ```

   This trims silence at both ends and evens out the volume between lines.
2. Add the line's id (the file name without `.mp3`) to `recordedNarration` in `src/content/recordings.ts`.
3. Run `npm test`. It fails if a listed id has no file, or a file's name doesn't match a real line.
4. If you changed any wording while recording, update the matching text in `src/content/narration.ts` (steps) or the habitat and organism records, so the captions match your voice.

How playback works: captions move sentence by sentence while your recording plays, timed by the length of each sentence. Pause, Replay, Skip, Mute and the voice volume slider all work the same as with the browser voice. If a recording can't load, that line falls back to the browser voice, so the lesson never goes silent.
