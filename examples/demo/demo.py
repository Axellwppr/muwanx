"""Muwanx Demo Application

This is a demo application showcasing the usage of muwanx.
The demo app is hosted on GitHub Pages: https://muwanx.github.io/muwanx/
"""

import os
from pathlib import Path

import mujoco
import onnx

import muwanx as mwx


def setup_builder() -> mwx.Builder:
    """Set up and return the builder with all demo projects configured.

    This function creates the builder and adds all projects, scenes, and policies
    but does not build or launch the application. Useful for testing.

    Returns:
        Configured Builder instance ready to be built.
    """
    # Ensure asset-relative paths resolve regardless of current working directory.
    os.chdir(Path(__file__).resolve().parent)
    base_path = os.getenv("MUWANX_BASE_PATH", "/")
    builder = mwx.Builder(base_path=base_path)

    # =======================
    # 1. Muwanx Demo Project
    # =======================
    demo_project = builder.add_project(
        name="Muwanx Demo",
    )

    # 1.A. Unitree Go2
    go2_scene = demo_project.add_scene(
        model=mujoco.MjModel.from_xml_path("assets/scene/muwanx/unitree_go2/scene.xml"),
        name="Go2",
    )
    go2_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_go2/facet.onnx"),
        name="Facet",
    )
    go2_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_go2/vanilla.onnx"),
        name="Vanilla",
    )
    go2_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_go2/robust.onnx"),
        name="Robust",
    )

    # 1.B. Unitree Go1
    go1_scene = demo_project.add_scene(
        model=mujoco.MjModel.from_xml_path("assets/scene/muwanx/unitree_go1/go1.xml"),
        name="Go1",
    )
    go1_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_go1/himloco.onnx"),
        name="HiMLoco",
    )
    go1_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_go1/decap.onnx"),
        name="Decap",
    )

    # 1.C. Unitree G1
    g1_scene = demo_project.add_scene(
        model=mujoco.MjModel.from_xml_path("assets/scene/muwanx/unitree_g1/scene.xml"),
        name="G1",
    )
    g1_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_g1/locomotion.onnx"),
        name="Locomotion",
    )
    g1_scene.add_policy(
        policy=onnx.load("assets/policy/unitree_g1/balance.onnx"),
        name="Balance",
    )

    # ============================
    # 2. MuJoCo Menagerie Project
    # ============================
    menagerie_project = builder.add_project(
        name="MuJoCo Menagerie",
        id="menagerie",
    )

    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/agilex_piper/scene.xml"
        ),
        name="Agilex Piper",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/agility_cassie/scene.xml"
        ),
        name="Agility Cassie",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/aloha/scene.xml"
        ),
        name="ALOHA",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/anybotics_anymal_b/scene.xml"
        ),
        name="ANYmal B",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/anybotics_anymal_c/scene.xml"
        ),
        name="ANYmal C",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/apptronik_apollo/scene.xml"
        ),
        name="Apptronik Apollo",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/arx_l5/scene.xml"
        ),
        name="ARX L5",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/berkeley_humanoid/scene.xml"
        ),
        name="Berkeley Humanoid",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/bitcraze_crazyflie_2/scene.xml"
        ),
        name="Bitcraze Crazyflie 2",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/booster_t1/scene.xml"
        ),
        name="Booster T1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/boston_dynamics_spot/scene.xml"
        ),
        name="Boston Dynamics Spot",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/dynamixel_2r/scene.xml"
        ),
        name="Dynamixel 2R",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/flybody/scene.xml"
        ),
        name="Flybody",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/fourier_n1/scene.xml"
        ),
        name="Fourier N1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/franka_emika_panda/scene.xml"
        ),
        name="Franka Emika Panda",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/franka_fr3/scene.xml"
        ),
        name="Franka FR3",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/google_barkour_v0/scene.xml"
        ),
        name="Google Barkour v0",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/google_barkour_vb/scene.xml"
        ),
        name="Google Barkour vB",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/google_robot/scene.xml"
        ),
        name="Google Robot",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/hello_robot_stretch/scene.xml"
        ),
        name="Hello Robot Stretch",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/hello_robot_stretch_3/scene.xml"
        ),
        name="Hello Robot Stretch 3",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/i2rt_yam/scene.xml"
        ),
        name="i2RT YAM",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/iit_softfoot/scene.xml"
        ),
        name="IIT SoftFoot",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/kinova_gen3/scene.xml"
        ),
        name="Kinova Gen3",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/kuka_iiwa_14/scene.xml"
        ),
        name="KUKA iiwa 14",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/leap_hand/scene_left.xml"
        ),
        name="LEAP Hand Left",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/leap_hand/scene_right.xml"
        ),
        name="LEAP Hand Right",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/low_cost_robot_arm/scene.xml"
        ),
        name="Low Cost Robot Arm",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_talos/scene_motor.xml"
        ),
        name="PAL Talos (Motor Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_talos/scene_position.xml"
        ),
        name="PAL Talos (Position Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago/scene_motor.xml"
        ),
        name="PAL TIAGo (Motor Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago/scene_position.xml"
        ),
        name="PAL TIAGo (Position Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago/scene_velocity.xml"
        ),
        name="PAL TIAGo (Velocity Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago_dual/scene_motor.xml"
        ),
        name="PAL TIAGo Dual (Motor Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago_dual/scene_position.xml"
        ),
        name="PAL TIAGo Dual (Position Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pal_tiago_dual/scene_velocity.xml"
        ),
        name="PAL TIAGo Dual (Velocity Control)",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/pndbotics_adam_lite/scene.xml"
        ),
        name="PNDBiotics Adam Lite",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/rethink_robotics_sawyer/scene.xml"
        ),
        name="Rethink Robotics Sawyer",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/robot_soccer_kit/scene.xml"
        ),
        name="Robot Soccer Kit",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/robotiq_2f85/scene.xml"
        ),
        name="Robotiq 2F85",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/robotiq_2f85_v4/scene.xml"
        ),
        name="Robotiq 2F85 v4",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/robotis_op3/scene.xml"
        ),
        name="Robotis OP3",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/shadow_dexee/scene.xml"
        ),
        name="Shadow DEXEE",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/shadow_hand/scene_left.xml"
        ),
        name="Shadow Hand Left",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/shadow_hand/scene_right.xml"
        ),
        name="Shadow Hand Right",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/skydio_x2/scene.xml"
        ),
        name="Skydio X2",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/stanford_tidybot/scene.xml"
        ),
        name="Stanford TidyBot",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/tetheria_aero_hand_open/scene_right.xml"
        ),
        name="TetherIA Aero Hand Open",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/trossen_vx300s/scene.xml"
        ),
        name="Trossen VX300S",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/trossen_wx250s/scene.xml"
        ),
        name="Trossen WX250S",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/trs_so_arm100/scene.xml"
        ),
        name="TRS SO-ARM100",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/ufactory_lite6/scene.xml"
        ),
        name="UFactory Lite6",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/ufactory_xarm7/scene.xml"
        ),
        name="UFactory xArm7",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/umi_gripper/scene.xml"
        ),
        name="UMI Gripper",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_a1/scene.xml"
        ),
        name="Unitree A1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_g1/scene.xml"
        ),
        name="Unitree G1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_go1/scene.xml"
        ),
        name="Unitree Go1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_go2/scene.xml"
        ),
        name="Unitree Go2",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_h1/scene.xml"
        ),
        name="Unitree H1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/unitree_z1/scene.xml"
        ),
        name="Unitree Z1",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/universal_robots_ur5e/scene.xml"
        ),
        name="Universal Robots UR5e",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/universal_robots_ur10e/scene.xml"
        ),
        name="Universal Robots UR10e",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/wonik_allegro/scene_left.xml"
        ),
        name="Wonik Allegro Left",
    )
    menagerie_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_menagerie/wonik_allegro/scene_right.xml"
        ),
        name="Wonik Allegro Right",
    )

    # =============================
    # 3. MuJoCo Playground Project
    # =============================
    playground_project = builder.add_project(
        name="MuJoCo Playground",
        id="playground",
    )

    # DeepMind Control Suite
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/acrobot.xml"
        ),
        name="DMC Acrobot",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/ball_in_cup.xml"
        ),
        name="DMC Ball In Cup",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/cartpole.xml"
        ),
        name="DMC Cartpole",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/cheetah.xml"
        ),
        name="DMC Cheetah",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/finger.xml"
        ),
        name="DMC Finger",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/fish.xml"
        ),
        name="DMC Fish",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/hopper.xml"
        ),
        name="DMC Hopper",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/humanoid.xml"
        ),
        name="DMC Humanoid",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/manipulator.xml"
        ),
        name="DMC Manipulator",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/pendulum.xml"
        ),
        name="DMC Pendulum",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/point_mass.xml"
        ),
        name="DMC Point Mass",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/reacher.xml"
        ),
        name="DMC Reacher",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/swimmer.xml"
        ),
        name="DMC Swimmer",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/dm_control_suite/xmls/walker.xml"
        ),
        name="DMC Walker",
    )

    # Manipulation Tasks
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/leap_hand/xmls/scene_mjx_cube.xml"
        ),
        name="LEAP Hand Cube",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/franka_emika_panda/xmls/mjx_single_cube.xml"
        ),
        name="Panda Single Cube",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/franka_emika_panda/xmls/mjx_single_cube_camera.xml"
        ),
        name="Panda Single Cube (Camera)",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/franka_emika_panda/xmls/mjx_cabinet.xml"
        ),
        name="Panda Cabinet",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/aloha/xmls/mjx_hand_over.xml"
        ),
        name="ALOHA Hand Over",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/aloha/xmls/mjx_single_peg_insertion.xml"
        ),
        name="ALOHA Single Peg Insertion",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/manipulation/franka_emika_panda_robotiq/xmls/scene_panda_robotiq_cube.xml"
        ),
        name="Panda Robotiq Cube",
    )

    # Locomotion Tasks
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_flat_terrain.xml"
        ),
        name="Go1 Flat Terrain",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="Go1 FeetOnly Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_feetonly_bowl.xml"
        ),
        name="Go1 FeetOnly Bowl",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_feetonly_rough_terrain.xml"
        ),
        name="Go1 FeetOnly Rough",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_feetonly_stairs.xml"
        ),
        name="Go1 FeetOnly Stairs",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/go1/xmls/scene_mjx_fullcollisions_flat_terrain.xml"
        ),
        name="Go1 FullCollisions Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/g1/xmls/scene_mjx_feetonly.xml"
        ),
        name="G1 FeetOnly",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/g1/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="G1 FeetOnly Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/g1/xmls/scene_mjx_feetonly_rough_terrain.xml"
        ),
        name="G1 FeetOnly Rough",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/h1/xmls/scene_mjx_feetonly.xml"
        ),
        name="H1 FeetOnly",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/t1/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="T1 FeetOnly Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/t1/xmls/scene_mjx_feetonly_rough_terrain.xml"
        ),
        name="T1 FeetOnly Rough",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/spot/xmls/scene_mjx_flat_terrain.xml"
        ),
        name="Spot Flat Terrain",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/spot/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="Spot FeetOnly Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/apollo/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="Apollo FeetOnly Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/op3/xmls/scene_mjx_feetonly.xml"
        ),
        name="OP3 FeetOnly",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/berkeley_humanoid/xmls/scene_mjx_feetonly_flat_terrain.xml"
        ),
        name="Berkeley Humanoid Flat",
    )
    playground_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/mujoco_playground/mujoco_playground/_src/locomotion/berkeley_humanoid/xmls/scene_mjx_feetonly_rough_terrain.xml"
        ),
        name="Berkeley Humanoid Rough",
    )

    # ====================
    # 4. MyoSuite Project
    # ====================
    myosuite_project = builder.add_project(
        name="MyoSuite",
        id="myosuite",
    )

    # Base MyoSuite scenes
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/simhive/myo_sim/hand/myohand.xml"
        ),
        name="Hand",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/simhive/myo_sim/arm/myoarm.xml"
        ),
        name="Arm",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/simhive/myo_sim/elbow/myoelbow_2dof6muscles.xml"
        ),
        name="Elbow",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/simhive/myo_sim/leg/myolegs.xml"
        ),
        name="Legs",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/simhive/myo_sim/finger/myofinger_v0.xml"
        ),
        name="Finger",
    )

    # MyoChallenge 2023 scenes
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_relocate.xml"
        ),
        name="mc23_Relocate",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/leg/myolegs_chasetag.xml"
        ),
        name="mc23_ChaseTag",
    )

    # MyoChallenge 2024 scenes
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_bionic_bimanual.xml"
        ),
        name="mc24_Bimanual",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/leg/myoosl_runtrack.xml"
        ),
        name="mc24_RunTrack",
    )

    # MyoChallenge 2025 scenes
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/arm/myoarm_tabletennis.xml"
        ),
        name="mc25_TableTennis",
    )
    myosuite_project.add_scene(
        model=mujoco.MjModel.from_xml_path(
            "assets/scene/myosuite/myosuite/envs/myo/assets/leg_soccer/myolegs_soccer.xml"
        ),
        name="mc25_Soccer",
    )

    return builder


def main():
    """Main entry point for the demo application.

    Environment variables:
        MUWANX_BASE_PATH: Base path for deployment (default: '/')
        MUWANX_NO_LAUNCH: Set to '1' to skip launching the browser
    """
    builder = setup_builder()
    # Build and launch the application
    app = builder.build()
    if os.getenv("MUWANX_NO_LAUNCH") == "1":
        return
    app.launch()


if __name__ == "__main__":
    main()
