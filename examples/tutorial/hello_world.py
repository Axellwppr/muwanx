"""Hello World

This is a simple "Hello World" example that demonstrates how to create a basic MuJoCo scene
using the MuWanX viewer. It sets up a scene with a plane and a box above it, and launches the viewer.
"""

import mujoco
import muwanx as mwx


def main():
    builder = mwx.Builder()
    hello_world_project = builder.add_project(name="Hello World")
    model = mujoco.MjModel.from_xml_string("""
    <mujoco>
      <worldbody>
        <light diffuse=".5 .5 .5" pos="0 0 3" dir="0 0 -1"/>
        <geom type="plane" size="1 1 0.1" rgba=".9 0 0 1"/>
        <body pos="0 0 1">
          <joint type="free"/>
          <geom type="box" size=".1 .2 .3" rgba="0 .9 0 1"/>
        </body>
      </worldbody>
    </mujoco>
    """)
    hello_world_project.add_scene(
        model=model,
        name="Box over Plane",
    )

    # Build the application
    app = builder.build()

    # Save to disk
    app.save("hello_world")

    # Or launch in browser (not yet implemented)
    # app.launch()

    print("✓ Builder example completed successfully!")
    print(f"  - Projects: {len(builder.get_projects())}")


if __name__ == "__main__":
    main()
