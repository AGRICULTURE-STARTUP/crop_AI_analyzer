"""Crop class label catalogs shared by API metadata and scanner worker."""

beans_classes = [
    "angular_leaf_spot",
    "anthracnose",
    "bean_rust",
    "healthy",
    "mosaic_virus",
]
cabbage_classes = [
    "Cabbage___Alternaria_Leaf_Spot",
    "Cabbage___Black_Rot",
    "Cabbage___Cabbage_aphid_colony",
    "Cabbage___Downy_Mildew",
    "Cabbage___Healthy",
    "Cabbage___Ring_Spot",
]
tomato_classes = [
    "bacterial_spot",
    "early_blight",
    "healthy",
    "late_blight",
    "leaf_mold",
    "mosaic_virus",
    "septoria_leaf_spot",
    "spider_mite",
    "target_spot",
    "yellow_leaf__curl_Virus",
]
potato_classes = [
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
]
capsicum_classes = ["Capsicum___Bacterial_spot", "Capsicum___healthy"]
cucumber_classes = [
    "Cucumber___Anthracnose",
    "Cucumber___Bacterial_Wilt",
    "Cucumber___Gummy_Stem_Blight",
    "Cucumber___Healthy_leaf",
]
pea_classes = [
    "Pea___Downy_Mildew",
    "Pea___Healthy",
    "Pea___Leafminner",
    "Pea___Powder_Mildew",
]
maize_classes = [
    "Corn___Northern_Leaf_Blight",
    "blight",
    "common_rust",
    "downy_mildew",
    "gray_leaf_spot",
    "healthy",
    "msv_streak_virus",
]
onion_classes = [
    "Onion___Alternaria_D",
    "Onion___Botrytis_Leaf_Blight",
    "Onion___Healthy",
    "Onion___Purple_blotch",
    "Onion___Virosis-D",
]
wheat_classes = [
    "Wheat___black_rust",
    "Wheat___brown_rust",
    "Wheat___healthy",
    "Wheat___leaf_blight",
    "Wheat___mildew",
    "Wheat___mite",
    "Wheat___septoria",
]
cauliflower_classes = [
    "Cauliflower___Bacterial_spot_rot",
    "Cauliflower___Black_Rot",
    "Cauliflower___Downy_Mildew",
    "Cauliflower___Healthy",
]
apple_classes = [
    "Apple_Scab",
    "Apple_rust_leaf",
    "Black_Rot",
    "Cedar_Apple_Rust",
    "Healthy",
]
ball_pepper_classes = ["Bacterial_Spot", "Healthy"]
cashew_nuts_classes = [
    "Cashew_anthracnose",
    "Cashew_gumosis",
    "Cashew_healthy",
    "Cashew_leaf_miner",
    "Cashew_red_rust",
]
cassava_classes = [
    "Cassava_bacterial_blight",
    "Cassava_brown_spot",
    "Cassava_green_mite",
    "Cassava_healthy",
    "Cassava_mosaic",
]
chilly_classes = [
    "Chili__healthy",
    "Chili__leaf curl",
    "Chili__leaf spot",
    "Chili__whitefly",
    "Chili__yellowish",
]
sugarcane_classes = ["Healthy", "Mosaic", "RedRot", "RedRust", "YellowRust "]
grape_classes = [
    "Black_Rot",
    "Esca_(Black Measles)",
    "Healthy",
    "Leaf_Blight",
]

KNOWN_CROP_CLASSES = {
    "wheat": wheat_classes,
    "maize": maize_classes,
    "potato": potato_classes,
    "beans": beans_classes,
    "cabbage": cabbage_classes,
    "cassava": cassava_classes,
    "tomato": tomato_classes,
    "capsicum": capsicum_classes,
    "cucumber": cucumber_classes,
    "onion": onion_classes,
    "pea": pea_classes,
    "cauliflower": cauliflower_classes,
    "apple": apple_classes,
    "ball_pepper": ball_pepper_classes,
    "cashew_nuts": cashew_nuts_classes,
    "chilly": chilly_classes,
    "sugarcane": sugarcane_classes,
    "grape": grape_classes,
}

# Crops with on-disk / HF .h5 models shipped today.
SUPPORTED_SCAN_CROPS = [
    "beans",
    "cabbage",
    "capsicum",
    "cauliflower",
    "cucumber",
    "maize",
    "onion",
    "pea",
    "potato",
    "tomato",
    "wheat",
]
