// ---------------- MOTOR PINS ----------------
const int ENA = 5;
const int IN1 = 8;
const int IN2 = 9;

const int ENB = 6;
const int IN3 = 10;
const int IN4 = 11;

// ---------------- ENCODER PINS ----------------
#define ENC_A 2
#define ENC_B 3

int PPR = 2048; // Total pulses per revolution
volatile long encoderCount = 0;

// ---------------- CONTROL VARIABLES ----------------
float target_angle = 0.0;
float current_angle = 0.0;
bool is_moving = false;    

// --- TEACHER'S MACROSCOPIC PWM VARIABLES ---
unsigned long pulseTimer = 0;
bool motorPulseActive = false; // Tracks if we are currently in the ON window or OFF window
float ton_duration = 0.0;      // Active ON time in seconds
float toff_duration = 0.0;     // Active OFF time in seconds

unsigned long lastPrintTime = 0;
const unsigned long printInterval = 10; // Print every 10ms (100Hz) to match Python backend

// Arduino R4 Minima fix variable
int last_speed = -1;

void setup() {
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(ENC_A), readEncoder, RISING);

  Serial.begin(115200); 
}

void loop() {
  unsigned long currentTime = millis();

  // -------- 1. SERIAL COMMAND PARSING --------
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 't') {
      target_angle = Serial.parseFloat();
    } else if (cmd == 's') {
      target_angle = current_angle; // Stop
    } else if (cmd == 'c') {
      encoderCount = 0;
      target_angle = 0.0;
    }
  }

  // -------- 2. ANGLE CALCULATION --------
  current_angle = (encoderCount * 360.0) / PPR;
  float error = target_angle - current_angle;
  float abs_error = abs(error);

  // -------- 3. MACRO-PWM MOTOR CONTROL --------
  if (abs_error > 5.0) {
    ton_duration = 0.25;    // 0.25 seconds ON (Medium steps)
    toff_duration = 0.1;    // 0.1 seconds OFF
    is_moving = true;
  } 
  else if (abs_error > 0.5 && abs_error <= 5.0) {
    ton_duration = 0.025;   // 0.025 seconds ON (Tiny micro-taps for precision!)
    toff_duration = 0.1;    // 0.1 seconds OFF
    is_moving = true;
  }
  else {
    // 2 > |error| > 1°  -->  Δton = 0
    ton_duration = 0.0;    
    toff_duration = 0.0;
  }

  // --- PULSE STATE MACHINE HANDLING ---
  if (ton_duration == 0.0) {
    stopMotors();
    is_moving = false; 
    motorPulseActive = false;
  } 
  else {
    // Determine if we should be timing the ON window or the OFF window
    unsigned long currentInterval = (motorPulseActive) ? (ton_duration * 1000) : (toff_duration * 1000);

    // Check if current time window has elapsed
    if (currentTime - pulseTimer >= currentInterval) {
      pulseTimer = currentTime; // Reset timer for the next phase
      motorPulseActive = !motorPulseActive; // Flip the switch (ON -> OFF or OFF -> ON)
    }

    // Execute physical power commands
    if (motorPulseActive) {
      applyDirection(error); // Slam the gas pedal! (255 PWM)
    } else {
      stopMotors();          // Take foot off the gas to coast!
    }
  }

  // -------- 4. TELEMETRY OUTPUT --------
  if (currentTime - lastPrintTime >= printInterval) {
    printAngleData(current_angle, error);
    lastPrintTime = currentTime;
  }
}

// ---------------- HELPER FUNCTIONS ----------------

void applyDirection(float error) {
  // 🔄 SWAPPED POLARITY to fix your Forward/Backward issue!
  if (error > 0) {
    // Forward / Flexion (Positive Target)
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
  }
  else {
    // Backward / Extension (Negative Target)
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
  }
  
  // R4 Minima Fix: Only call analogWrite once when the pulse turns ON
  if (last_speed != 255) {
    analogWrite(ENA, 255);
    analogWrite(ENB, 255);
    last_speed = 255;
  }
}

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);

  // R4 Minima Fix: Only call analogWrite once when the pulse turns OFF
  if (last_speed != 0) {
    analogWrite(ENA, 0);
    analogWrite(ENB, 0);
    last_speed = 0; 
  }
}

void printAngleData(float currentAngle, float error) {
  Serial.print("Target: "); Serial.print(target_angle);
  Serial.print(" | Current: "); Serial.print(currentAngle);
  Serial.print(" | Error: "); Serial.print(error);
  if (!is_moving) {
    Serial.println(" | ⚡ OFF (STOPPED)");
  } else {
    Serial.println(motorPulseActive ? " | ⚡ ON (Pulse)" : " | ⚡ OFF (Coast)");
  }
}

// ---------------- ENCODER ISR ----------------
void readEncoder() {
  int b = digitalRead(ENC_B);
  // 🔄 SWAPPED POLARITY to match the reversed motor!
  if (b == HIGH) {
    encoderCount--; 
  } else {
    encoderCount++; 
  }
}
