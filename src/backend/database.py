class Database:
    def __init__(self):
        self.connected = False
        self.records = []

    def connect(self):
        self.connected = True
        return "[DB] Connected to placeholder database."

    def insert(self, data):
        if not self.connected:
            return "[DB] ERROR: Not connected."
        self.records.append(data)
        return "[DB] Inserted."

    def fetch_all(self):
        return self.records
