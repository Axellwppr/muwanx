"""URL Routing Example - Muwanx Builder

This example demonstrates how to use the project ID feature to create
URL-based routing structure for your muwanx application.

URL Structure:
- Main project (no id): https://example.com/
- Project with id="menagerie": https://example.com/#/menagerie/
- Project with id="playground": https://example.com/#/playground/
"""

import muwanx as mwx

# Note: This is a minimal example showing the URL routing structure.
# For a complete working demo, you'll need actual MuJoCo models and ONNX policies.


def main():
    # Create a builder
    builder = mwx.Builder()

    # Main project (accessible at root URL: /)
    main_project = builder.add_project(name="Main Demo")
    # main_project.add_scene(...)

    # MuJoCo Menagerie project (accessible at /#/menagerie/)
    menagerie_project = builder.add_project(
        name="MuJoCo Menagerie",
        id="menagerie"
    )
    # menagerie_project.add_scene(...)

    # MuJoCo Playground project (accessible at /#/playground/)
    playground_project = builder.add_project(
        name="MuJoCo Playground",
        id="playground"
    )
    # playground_project.add_scene(...)

    # MyoSuite project (accessible at /#/myosuite/)
    myosuite_project = builder.add_project(
        name="MyoSuite",
        id="myosuite"
    )
    # myosuite_project.add_scene(...)

    # Build the application
    app = builder.build()

    # Save to disk - the config.json will include the project IDs
    # which the frontend uses for routing
    # app.save("url_routing_demo")

    print("✓ URL routing example completed!")
    print("\nProject structure:")
    for project in builder.get_projects():
        if project.id:
            print(f"  - {project.name}: /#/{project.id}/")
        else:
            print(f"  - {project.name}: / (main route)")


if __name__ == "__main__":
    main()
