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
