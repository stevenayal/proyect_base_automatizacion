import unittest

from grupo07_juan_semana5_preflight import MAX_RESET_WAIT_SECONDS, seconds_until_reset


class PreflightResetTests(unittest.TestCase):
    def test_epoch_reset(self):
        self.assertEqual(seconds_until_reset("1700000060", now=1700000000), 60)

    def test_epoch_milliseconds_reset(self):
        self.assertEqual(seconds_until_reset("1700000060000", now=1700000000), 60)

    def test_relative_reset(self):
        self.assertEqual(seconds_until_reset("30", now=1700000000), 30)

    def test_unbounded_or_invalid_reset_is_rejected(self):
        self.assertIsNone(seconds_until_reset(str(MAX_RESET_WAIT_SECONDS + 1)))
        self.assertIsNone(seconds_until_reset("not-a-number"))


if __name__ == "__main__":
    unittest.main()
