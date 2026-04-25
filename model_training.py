'''import keras
import tensorflow as tf
from keras.applications import MobileNetV2

pretrained_model=MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(224,224,3)
)
pretrained_model.trainable=False

train=tf.keras.utils.image_dataset_from_directory(
    '/content/drive/My Drive/crops2/train',
    image_size=(224,224),
    batch_size=32,


)
test=tf.keras.utils.image_dataset_from_directory(
    '/content/drive/My Drive/crops2/test',
    image_size=(224,224),
    batch_size=32,

)
num_classes=len(train.class_names)
print(num_classes)

#data augamentation
from keras import layers,models
from sklearn.metrics import classification_report

# Data augmentation
data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),

])


normalization_layer = layers.Rescaling(1./255)
AUTOTUNE = tf.data.AUTOTUNE
train = train.map(lambda x, y: (data_augmentation(normalization_layer(x)), y),
                        num_parallel_calls=tf.data.AUTOTUNE
)
test= test.map(lambda x, y: (normalization_layer(x), y),
                     num_parallel_calls=tf.data.AUTOTUNE
                    )
train =train.cache().shuffle(200).prefetch(AUTOTUNE)
test = test.cache().prefetch(AUTOTUNE)

from keras.callbacks import EarlyStopping,ModelCheckpoint
from keras import Input,Model
inputs = Input(shape=(224, 224, 3))
x = pretrained_model(inputs, training=False)           # Pass inputs through MobileNetV2
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.2)(x)
outputs = layers.Dense(num_classes, activation='softmax')(x)

model = Model(inputs, outputs)
earlystop=EarlyStopping(
    monitor='val_loss',
    patience=2,
    restore_best_weights=True,
    verbose=1
    )
checkpoint=ModelCheckpoint(
    filepath='/content/mobilenet2_trained.keras',
    monitor='val_loss',
    save_best_only=True,
    save_weights_only=False,
    mode='min',
    verbose=1,
    )
model.compile(
    tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()

model.fit(
    train,
    epochs=10,
    validation_data=test,
    callbacks=[earlystop,checkpoint]
    )
model.evaluate(test)


earlystop=EarlyStopping(
    monitor='val_loss',
    patience=2,
    restore_best_weights=True,
    verbose=1
    )
checkpoint=ModelCheckpoint(
    filepath='/content/mobilenet_finetuned2.keras',
    monitor='val_loss',
    save_best_only=True,
    save_weights_only=False,
    verbose=1
    )
pretrained_model.trainable=True
for layer in pretrained_model.layers[:-20]:
    layer.trainable=False
model.compile(
    tf.keras.optimizers.Adam(learning_rate=0.00001),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()
model.fit(
    train,
    epochs=5,
    validation_data=test,
    callbacks=[earlystop,checkpoint]
)
'''
import google.generativeai as genai
genai.configure(api_key="AIzaSyBa3oSrwfl48IORlRV5PTfSd7sUnq37lW4")

for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)