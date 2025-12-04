# Final Project - CMPM 121

# Devlog Entry – 11/13/2025

## Introducing the Team
**Tools Lead:** Noah Billendo  

**Engine Lead:** Andrew Degan

**Design Lead:**  Adira Rana

**Testing Lead:** Michael Carrillo

## Tools and Materials

### Engine
We plan to use the [three.js](https://threejs.org/) library for rendering 3D objects in JavaScript. This is largely due to the community surrounding it and the documentation that has arisen from that popularity. With many of our options being completely unknown by many of us, this documentation will come in especially handy. Additionally, we would like to pair it with [ammo.js](https://kripken.github.io/ammo.js/) as our physics library, as after some research, it has been widely used alongside three.js in several projects, proving that these two libraries work well together. Our final platform will be on the web using GitHub pages to deploy our project (in tandem with GitHub’s codespaces), chosen to continue the direction of web development that we have taken in CMPM 121 up until now. Additionally, the web is widely accessible, making it easy to share with others for playtesting

### Language
Our team plans on working in Javascript or Typescript. The reason we chose what we did is because of the ease of use as we as a team have already spent a comfortable amount of time using the language to make a project in it. Additionally the engines we chose work in Javascript and Typescript.

### Tools
In terms of tools, we will probably attempt to use the editor provided on the [three.js page](https://threejs.org/). We are also likely going to continue to use the IDE’s we’ve been using throughout the class. We make these choices because it provides us room to learn further with typeScript and javaScript while also allowing us to have a bit of familiarity with what tools we are using. It also does not seem like we as a group have too much experience with 3D editors, so it might be helpful to use one associated with the platform we are using. If not the provided editor by three.js, we have a little bit of Blender knowledge on our team.

### Generative AI
Our plan when it comes to Generative AI to use it as an assistant tool. We’ll use either ChatGPT or GitHub Copilot to explain any confusing errors that might pop up during the development process. We want the Generative AI to assist us, not make the game. We won’t ask it to complete full sections of code, or look through an entire file and tell it to edit the mistake that’s within. Since Copilot tends to write in the code directly, we can always review the code to make sure we understand it first before fully implementing it into our code.

## Outlook
We aren’t sure what type of game we’re planning to make, but we do know that we want to build something that uses the three.js as well as possibly, ammo.js. We think the hardest part of this project will more than likely be understanding three.js and ammo.js for the first time. Since most of the projects for CMPM 121 have been mostly only TypeScript and 2D. Since we don’t know our game project idea, we’re hoping that this project helps us understand how these systems work and hopefully teaches us how to properly organize a project.

#### ---End of Entry------------------------------------------------------------------


# Devlog Entry – 11/20/2025

## How we satisfied the software requirements

1. Our project runs on the baseline web browser platform with a small Vite setup and TypeScript. We did not start from a full game engine or framework that already has 3D and physics built in. All of the 3D and physics behavior comes from libraries we chose and wired up ourselves, not from something like Unity or Phaser.

2. We use `three` as our third party 3D rendering library. In `src/main.ts` we import `THREE` and use it to create the scene, camera, lights, meshes, and the render loop. The cube, the ground platforms, and all the visible objects are `THREE.Mesh` objects, and the renderer draws everything into the canvas each frame.

3. We use a third party physics library based on `ammo.js`. Our `PhysicsEngine` class wraps `AmmoPhysics` from the three examples and connects it to our three.js meshes. We call `physics.addBox` to create rigid bodies for the ground and the cube, and the physics update runs each frame so gravity and collisions happen without us writing the low level physics math by hand.

4. The prototype presents the player with a simple physics based puzzle. The puzzle is to move the green cube so that it lands on the green target platform instead of the red fail platform. The cube is affected by gravity, and once the player lets go, the simulation decides whether it falls onto the correct platform or not.

5. The player can control the simulation in a way that lets them succeed or fail. We listen for mouse events on the renderer canvas. When the player clicks on the cube, we remove it from the physics world and let them drag it around in 3D space with the mouse. When they release the mouse, we drop the cube back into the physics world so gravity and collisions take over. Where they choose to drop it determines if they reach the goal or hit the fail area.

6. The game detects success or failure and reports it with graphics. In the animation loop we call `isTouching` to check if the cube’s bounding box overlaps the green target platform or the red fail platform. When we detect success for the first time, we call `showText` to create a big green “SUCCESS” message at the top of the screen. When we detect a fail, we show a red “TRY AGAIN” message instead and clear any success state.

7. We use linting as our before commit automation. In `deno.json` we set up `deno lint` on the `src` folder and define tasks like `lint` and `ci` that run check, lint, format check, and build in one command. Our VS Code settings enable Deno linting so problems show up right in the editor while we work. The idea is that we run these tasks and fix lint errors before commits, so the code that goes into the repo already passes the basic checks.

8. We use GitHub Actions to automatically deploy to GitHub Pages after pushes. The `.github/workflows/deploy.yml` file builds the project using our Deno and Vite setup, uploads the `dist` folder as an artifact, and then publishes it to GitHub Pages. That means once we push to the main branch, the new version of the game is packaged and deployed without us having to run the build and upload steps by hand.

## Reflection

When we look back at how we got the F1 requirements done, our plan didn't really changed from when we first made the team. At the start we didn’t really know what kind of game we wanted, so our ideas were super broad. We still don't really know what type of game we're planning to make. We were just simply figuring out how all of this works and trying to satify the F1 requirement while we still think about what our game will be.

While our roles didn't change or what task each role was supposed to fullfill, we did change how we're tackling our assignments going forward. Since Tools and Engine Lead both work hand-to-hand, we decided that going forward, the Design Lead won't work on anything until the Engine and Tools Lead got everything done. Which allowed us to make this simple puzzle on time without any issues.

#### ---End of Entry------------------------------------------------------------------

# Devlog Entry – 12/1/2025

## How we satisfied the software requirements

1. We stayed with the same setup from F1. Our game still uses the browser as the platform with TypeScript. We use three.js for all the 3D rendering and our physics setup still comes from the same physics system we used before. The browser does not give us these features by default, so we continue to bring them in ourselves and connect them to the game logic the same way we did in F1.

2. We added a simple scene system that lets the player move between different rooms. We treat each scene like its own space with its own objects and layout. When the player clicks on the spot that leads to another room, the game switches scenes and loads the next set of objects. This makes it feel more like a point and click adventure since the player is traveling through different locations instead of staying in one spot.

3. The game lets the player select objects directly in each scene. When the player clicks on an object, the game checks what was clicked and responds based on that item. This can be examining something, picking it up, or dragging it around. We used raycasting on the 3D scene so the click targets the right item. From the player’s point of view it feels like a normal point and click interaction where you tap something and the game reacts the way you expect.

4. We added an inventory system so the player can pick up items and use them later. When the player interacts with certain objects, the item gets put into the inventory. Other scenes check what the player is holding to decide what actions are possible. This made the game feel more connected, since the object you picked up in one room can be brought to the second room.

5. The game has a physics based puzzle that the player must solve in the second room. The puzzle depends on how the player interacts with the physics objects in the scene. Completing the puzzle will immediately show the results.

6. The puzzle can be won or lost based on the player’s own actions and reasoning. The outcome depends on where they place objects and how they choose to use the object they have. If the player understands the layout and makes the right choice, they can beat the puzzle. But also making the wrong choice will make you fail the puzzle.

7. The game can reach an ending after completing our simple puzzle. Since there are only two rooms, it's straightforward on how our game will end. Either they reached the ending where they've completed the puzzle successfully. Or the ending where they failed the puzzle.

## Reflection

Working on the F2 requirements changed our plan a lot compared to F1. In F1 we only had to make one small puzzle in one room, so things were pretty simple. For F2 we had to think about scenes, objects, inventory, and how everything connects, which made the game feel bigger. We had to rethink some of our ideas so the physics puzzle actually worked when implementing the new features. Our roles also stayed the same like in F1. Overall, F2 showed us how much more planning we need when the game gets more complex even if it's such simple changes overall.

#### ---End of Entry------------------------------------------------------------------

# Devlog Entry - 12/4/2025

## Selected requirements
For F3, we picked requirements 3, 4, 5, and 6. We chose these because they fit well with what we already built during F2, and they were features we wanted to learn more about. The save system felt useful for making our game feel more complete. Light and dark mode was already close because of our dark background, so we wanted to finish that idea. Touchscreen controls made sense because our point and click design already works with dragging an object. For language support, we thought it would be fun to see if our text system that works in English could also work with a logographic language, and a right to left language.

## How we satisfied the software requirements

### Requirement 3: Save system
We added a full save and load system in `SaveManager.ts`. This file stores the current scene, important puzzle states, and the inventory. Every time the player enters a new scene or picks up an item, we call the save function so the game keeps the latest state. When the game starts, the save manager checks if there is already a save file and loads it. This makes the game continue from where the player left off even if the browser is closed. We added multiple save points by saving different keys, and we support auto save by calling the save method whenever something important changes.

### Requirement 4: Light and dark visual themes
We added a light and dark mode system that responds to the browser or operating system settings. The game listens for theme changes and updates the UI by adding a `.dark` class to the body. The CSS file controls all the style changes, including inventory color, UI button color, and text color. In `style.css` you can see both light and dark rules for our main UI parts, like the inventory and language menu. We also linked the theme to in game lighting, so the scenes look brighter in light mode and darker in dark mode. This makes the theme feel like it is part of the world instead of just a cosmetic border change.

### Requirement 5: Touchscreen gameplay  
We added full touchscreen support on top of the existing mouse controls. We did this by adding pointer and touch events in `main.ts`, so players can tap to change scenes, tap to open menus, and drag the cube with a finger. The mouse controls still work the same as before, so the game supports both styles of input at the same time. This makes the game playable on phones and tablets while still working on normal computers.

### Requirement 6: Three language support (English, Hebrew, and Japanese)  
We added a language menu and a full text system so the game works in English, Hebrew, and Japanese. The menu appears when the player opens the UI panel. In `main.ts` we store the currently selected language and load the matching text file for tutorials and messages. The CSS already supports flipping text direction because Hebrew reads right to left, so the layout updates when that language is selected. Japanese uses a logographic script, so we made sure our font and spacing worked correctly. The language flags in `style.css` help the player pick the language they want. The system updates all main UI text when the player changes languages, so the game can be played from start to finish in all three languages.

## Reflection
F3 changed our plan more than we expected. On top of the feedback we corrected from the playtesting, nce we added the save system and theme changes, we had to reorganize some of our older code so everything stayed consistent between scenes. Adding touchscreen controls also made us rethink how dragging and clicking actually worked. The language system pushed us to keep all our text in one place instead of writing it inline, which made the game easier to manage. Overall, F3 made us clean up our project and think more about how real games handle saving, themes, and accessibility. It helped us see how many small systems need to work together so the player has a smooth experience.

#### ---End of Entry------------------------------------------------------------------
