"""AR Fashion Try-On — AWS-style architecture diagram (diagrams-as-code).
pip install diagrams ; apt/brew install graphviz ; python architecture.py
"""
from diagrams import Diagram, Cluster, Edge
from diagrams.custom import Custom
from diagrams.onprem.client import Users

I = lambda n: f"icons/{n}.png"
graph = {"fontname": "Helvetica", "fontsize": "22", "pad": "0.6", "nodesep": "0.7",
         "ranksep": "1.4", "splines": "spline", "newrank": "true", "compound": "true", "bgcolor": "white", "labelloc": "t"}
node = {"fontname": "Helvetica", "fontsize": "12", "fontcolor": "#232F3E"}
edge = {"fontname": "Helvetica-Bold", "fontsize": "11", "color": "#545B64", "fontcolor": "#232F3E"}

def group(label, color, fill):  # AWS group style: thin coloured border, label top-left
    return {"fontname": "Helvetica-Bold", "fontsize": "14", "fontcolor": color,
            "style": "rounded", "color": color, "bgcolor": fill, "pencolor": color,
            "labeljust": "l", "penwidth": "1.5", "margin": "24"}

def step(n, txt="", **kw):
    return Edge(label=f" {n}  {txt} ", **kw)

with Diagram("AR Fashion Try-On — System Architecture", filename="ar_fashion_architecture",
             outformat=["png", "svg"], show=False, direction="LR",
             graph_attr=graph, node_attr=node, edge_attr=edge):
    user = Users("Shopper\n(browser / webcam)")

    with Cluster("Layer 1 · Frontend — Next.js", graph_attr=group("", "#147EBA", "#F2F8FD")):
        web = Custom("Next.js App\nPhoto Try-On HD", I("nextdotjs"))
        with Cluster("AR Preview · real-time 2D (client-side)", graph_attr=group("", "#147EBA", "#FFFFFF")):
            pose = Custom("MediaPipe Pose\nlandmarks", I("mediapipe"))
            three = Custom("Three.js overlay\n+ live transforms", I("threedotjs"))
            pose >> Edge(color="#147EBA") >> three

    with Cluster("Layer 2 · Backend — Railway (Docker VM)", graph_attr=group("", "#B0084D", "#FDF4F7")):
        api = Custom("FastAPI\ngateway", I("fastapi"))
        with Cluster("Microservices", graph_attr=group("", "#B0084D", "#FFFFFF")):
            cls = Custom("Garment classifier\nTensorFlow CNN", I("tensorflow"))
            u2 = Custom("Garment extraction\nU²-Net bg removal", I("pytorch"))
            cv = Custom("Outfit constructor\nOpenCV merge", I("opencv"))
            vton = Custom("Try-On client\nGradio API", I("docker"))

    with Cluster("Layer 3 · Storage & Delivery", graph_attr=group("", "#3F8624", "#F4FAF0")):
        cdn = Custom("Cloudinary CDN\noriginals/ · garments/\noutfits/ · results/", I("cloudinary"))

    with Cluster("Layer 4 · AI Inference — Hugging Face Space (GPU)", graph_attr=group("", "#8C4FFF", "#F7F3FF")):
        inp = Custom("Input handling\nperson + garment", I("huggingface"))
        pre = Custom("Preprocessing\nDensePose + SCHP", I("pytorch"))
        diff = Custom("CatVTON diffusion\nVAE → UNet2D → VAE", I("pytorch"))
        inp >> Edge(color="#8C4FFF") >> pre >> Edge(color="#8C4FFF") >> diff

    user >> step(1, "open app") >> web
    user >> Edge(style="dashed", label=" AR mode ") >> pose
    web >> step(2, "upload images", constraint="false") >> cdn
    web >> step(3, "REST /tryon") >> api
    api >> Edge(color="#B0084D") >> [cls, u2, cv, vton]
    u2 >> step(4, "store garments", color="#3F8624") >> cdn
    cv >> step(5, "store outfits", color="#3F8624") >> cdn
    vton >> step(6, "predict()", color="#8C4FFF") >> inp
    cdn >> step(7, "fetch inputs", style="dashed") >> inp
    diff >> step(8, "upload result", color="#3F8624", constraint="false") >> cdn
    cdn >> step(9, "deliver result URL", style="dashed", constraint="false") >> web
